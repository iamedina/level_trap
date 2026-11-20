const db = require('../config/database');

/**
 * Cálculo de Puntuación Global en Backend:
 * Formula: ((BaseTimeMs - TiempoEmpleadoMs) / 10) - (Muertes * 250)
 * Asegurando que BaseTimeMs corresponda al nivel o carrera.
 */
function calculateScore(baseTimeMs, timeMs, deaths) {
  const timeDifference = Math.max(0, baseTimeMs - timeMs);
  const scoreFromTime = Math.floor((timeDifference / 1000) * 100);
  const deathPenalty = deaths * 250;
  return Math.max(0, scoreFromTime - deathPenalty);
}

/**
 * Guardar o actualizar un récord de Speedrun con datos de Ghost Engine
 */
const saveRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { levelNumber, timeMs, deaths, ghostData } = req.body;

    if (levelNumber === undefined || timeMs === undefined) {
      return res.status(400).json({
        success: false,
        error: 'levelNumber y timeMs son requeridos.'
      });
    }

    if (timeMs <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El tiempo de speedrun debe ser mayor a 0 milisegundos.'
      });
    }

    // Obtener tiempo base de referencia
    let baseTimeMs = 60000;
    if (levelNumber > 0) {
      const level = await db.levels.findOneAsync({ level_number: levelNumber });
      if (level) {
        baseTimeMs = level.base_time_ms;
      }
    } else {
      // Carrera completa (50 niveles): 30 minutos base
      baseTimeMs = 1800000;
    }

    const calculatedScore = calculateScore(baseTimeMs, timeMs, deaths || 0);

    // Verificar si ya existe un récord previo de este usuario para el nivel
    const existingRecord = await db.speedrun_records.findOneAsync({
      user_id: userId,
      level_number: levelNumber
    });

    let isNewBest = false;
    let recordId = null;

    const ghostString = typeof ghostData === 'object' ? JSON.stringify(ghostData) : ghostData;

    if (!existingRecord) {
      isNewBest = true;
      const newId = await db.getNextId('speedrun_records');
      const inserted = await db.speedrun_records.insertAsync({
        id: newId,
        user_id: userId,
        level_number: levelNumber,
        time_ms: timeMs,
        deaths: deaths || 0,
        score: calculatedScore,
        ghost_data: ghostString || null,
        created_at: new Date(),
        updated_at: new Date()
      });
      recordId = inserted.id;
    } else if (timeMs < existingRecord.time_ms) {
      isNewBest = true;
      await db.speedrun_records.updateAsync(
        { id: existingRecord.id },
        {
          $set: {
            time_ms: timeMs,
            deaths: deaths !== undefined ? deaths : existingRecord.deaths,
            score: Math.max(calculatedScore, existingRecord.score),
            ghost_data: ghostString || existingRecord.ghost_data,
            updated_at: new Date()
          }
        }
      );
      recordId = existingRecord.id;
    }

    return res.status(200).json({
      success: true,
      message: isNewBest ? '¡Nuevo récord personal registrado!' : 'Récord procesado.',
      data: {
        isNewBest,
        timeMs,
        deaths: deaths || 0,
        score: calculatedScore,
        recordId
      }
    });
  } catch (error) {
    console.error('Error al guardar récord de speedrun:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al procesar el récord de speedrun.'
    });
  }
};

/**
 * Obtener la silueta fantasma (Ghost Engine) de la mejor marca de un nivel
 */
const getGhostRecord = async (req, res) => {
  try {
    const levelNumber = parseInt(req.params.levelNumber, 10);

    if (isNaN(levelNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Número de nivel inválido.'
      });
    }

    // Buscar los récords del nivel que contengan ghost_data
    const records = await db.speedrun_records.findAsync({
      level_number: levelNumber,
      ghost_data: { $ne: null }
    });

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No hay silueta fantasma registrada para el nivel ${levelNumber}.`
      });
    }

    records.sort((a, b) => a.time_ms - b.time_ms);
    const bestRecord = records[0];

    const user = await db.users.findOneAsync({ id: bestRecord.user_id });

    let parsedGhost = [];
    try {
      parsedGhost = JSON.parse(bestRecord.ghost_data);
    } catch (e) {
      parsedGhost = [];
    }

    return res.status(200).json({
      success: true,
      data: {
        recordId: bestRecord.id,
        holderUsername: user ? user.username : 'Anónimo',
        timeMs: bestRecord.time_ms,
        ghostData: parsedGhost
      }
    });
  } catch (error) {
    console.error('Error al obtener ghost data:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar la silueta fantasma.'
    });
  }
};

/**
 * Tabla de Clasificación Global (Leaderboard) con Persistencia Real
 */
const getLeaderboard = async (req, res) => {
  try {
    const levelNumber = req.query.level ? parseInt(req.query.level, 10) : 0; // 0 = Global Full Run por defecto
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const records = await db.speedrun_records.findAsync({ level_number: levelNumber });

    // Ordenar por score DESC, luego time_ms ASC
    records.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time_ms - b.time_ms;
    });

    const sliced = records.slice(0, limit);

    // Obtener nombres de usuario
    const userIds = [...new Set(sliced.map((r) => r.user_id))];
    const users = await db.users.findAsync({ id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    const formatted = sliced.map((rec, index) => {
      const minutes = Math.floor(rec.time_ms / 60000);
      const seconds = Math.floor((rec.time_ms % 60000) / 1000);
      const millis = rec.time_ms % 1000;
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;

      return {
        rank: index + 1,
        userId: rec.user_id,
        username: userMap.get(rec.user_id) || 'Jugador',
        timeMs: rec.time_ms,
        timeFormatted: formattedTime,
        deaths: rec.deaths,
        score: rec.score,
        date: rec.created_at
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        levelNumber,
        totalEntries: formatted.length,
        leaderboard: formatted
      }
    });
  } catch (error) {
    console.error('Error al obtener leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar la tabla de clasificación.'
    });
  }
};

module.exports = {
  saveRecord,
  getGhostRecord,
  getLeaderboard
};
