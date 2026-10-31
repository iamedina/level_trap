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
      const level = await db('levels').where({ level_number: levelNumber }).first();
      if (level) {
        baseTimeMs = level.base_time_ms;
      }
    } else {
      // Carrera completa (50 niveles): 30 minutos base
      baseTimeMs = 1800000;
    }

    const calculatedScore = calculateScore(baseTimeMs, timeMs, deaths || 0);

    // Verificar si ya existe un récord previo de este usuario para el nivel
    const existingRecord = await db('speedrun_records')
      .where({ user_id: userId, level_number: levelNumber })
      .first();

    let isNewBest = false;
    let recordId = null;

    const ghostString = typeof ghostData === 'object' ? JSON.stringify(ghostData) : ghostData;

    if (!existingRecord) {
      isNewBest = true;
      const [insertedId] = await db('speedrun_records').insert({
        user_id: userId,
        level_number: levelNumber,
        time_ms: timeMs,
        deaths: deaths || 0,
        score: calculatedScore,
        ghost_data: ghostString || null,
        created_at: new Date(),
        updated_at: new Date()
      });
      recordId = insertedId;
    } else if (timeMs < existingRecord.time_ms) {
      isNewBest = true;
      await db('speedrun_records')
        .where({ id: existingRecord.id })
        .update({
          time_ms: timeMs,
          deaths: deaths !== undefined ? deaths : existingRecord.deaths,
          score: Math.max(calculatedScore, existingRecord.score),
          ghost_data: ghostString || existingRecord.ghost_data,
          updated_at: new Date()
        });
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

    // Buscar el récord global con menor tiempo que contenga datos de fantasma
    const bestRecord = await db('speedrun_records')
      .join('users', 'speedrun_records.user_id', 'users.id')
      .where('speedrun_records.level_number', levelNumber)
      .whereNotNull('speedrun_records.ghost_data')
      .select(
        'speedrun_records.id',
        'speedrun_records.time_ms',
        'speedrun_records.deaths',
        'speedrun_records.ghost_data',
        'users.username'
      )
      .orderBy('speedrun_records.time_ms', 'asc')
      .first();

    if (!bestRecord) {
      return res.status(404).json({
        success: false,
        error: `No hay silueta fantasma registrada para el nivel ${levelNumber}.`
      });
    }

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
        holderUsername: bestRecord.username,
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

    const records = await db('speedrun_records')
      .join('users', 'speedrun_records.user_id', 'users.id')
      .where('speedrun_records.level_number', levelNumber)
      .select(
        'speedrun_records.id',
        'speedrun_records.time_ms',
        'speedrun_records.deaths',
        'speedrun_records.score',
        'speedrun_records.created_at',
        'users.id as user_id',
        'users.username'
      )
      .orderBy('speedrun_records.score', 'desc')
      .orderBy('speedrun_records.time_ms', 'asc')
      .limit(limit);

    // Formatear tiempos legibles (00:00.000)
    const formatted = records.map((rec, index) => {
      const minutes = Math.floor(rec.time_ms / 60000);
      const seconds = Math.floor((rec.time_ms % 60000) / 1000);
      const millis = rec.time_ms % 1000;
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;

      return {
        rank: index + 1,
        userId: rec.user_id,
        username: rec.username,
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

