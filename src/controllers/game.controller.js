const db = require('../config/database');

/**
 * Obtener o inicializar el progreso del jugador
 */
const getProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    let progress = await db('player_progress').where({ user_id: userId }).first();

    if (!progress) {
      const [newId] = await db('player_progress').insert({
        user_id: userId,
        current_level: 1,
        max_level_reached: 1,
        total_deaths: 0,
        game_completed: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      progress = await db('player_progress').where({ id: newId }).first();
    }

    return res.status(200).json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar el progreso del jugador.'
    });
  }
};

/**
 * Obtener todos los niveles (resumen para selección de nivel / progreso)
 */
const getAllLevels = async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await db('player_progress').where({ user_id: userId }).first();
    const maxLevel = progress ? progress.max_level_reached : 1;

    const levels = await db('levels')
      .select('id', 'level_number', 'zone_id', 'zone_name', 'title', 'is_boss_level', 'base_time_ms')
      .orderBy('level_number', 'asc');

    const mappedLevels = levels.map((lvl) => ({
      ...lvl,
      is_unlocked: lvl.level_number <= maxLevel,
      is_current: lvl.level_number === (progress ? progress.current_level : 1)
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalLevels: mappedLevels.length,
        levels: mappedLevels
      }
    });
  } catch (error) {
    console.error('Error al obtener catálogo de niveles:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar la lista de niveles.'
    });
  }
};

/**
 * Obtener datos completos de un nivel específico desde la Base de Datos
 */
const getLevel = async (req, res) => {
  try {
    const levelNumber = parseInt(req.params.levelNumber, 10);

    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 50) {
      return res.status(400).json({
        success: false,
        error: 'El número de nivel debe estar comprendido entre 1 y 50.'
      });
    }

    const level = await db('levels').where({ level_number: levelNumber }).first();

    if (!level) {
      return res.status(404).json({
        success: false,
        error: `El nivel ${levelNumber} no existe en la base de datos.`
      });
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(level.data);
    } catch (parseErr) {
      console.error(`Error al parsear layout del nivel ${levelNumber}:`, parseErr);
      parsedData = {};
    }

    return res.status(200).json({
      success: true,
      data: {
        levelNumber: level.level_number,
        zoneId: level.zone_id,
        zoneName: level.zone_name,
        title: level.title,
        isBossLevel: Boolean(level.is_boss_level),
        baseTimeMs: level.base_time_ms,
        layout: parsedData
      }
    });
  } catch (error) {
    console.error('Error al obtener nivel:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar los datos del nivel.'
    });
  }
};

/**
 * Registrar muerte en BD (Cero Mocks: persiste en death_logs y player_progress)
 */
const registerDeath = async (req, res) => {
  try {
    const userId = req.user.id;
    const { levelNumber, trapType, positionX, positionY, survivalTimeMs } = req.body;

    if (!levelNumber || !trapType) {
      return res.status(400).json({
        success: false,
        error: 'levelNumber y trapType son requeridos para auditar la muerte.'
      });
    }

    // 1. Guardar en registro histórico de muertes
    await db('death_logs').insert({
      user_id: userId,
      level_number: levelNumber,
      trap_type: trapType,
      position_x: positionX !== undefined ? positionX : null,
      position_y: positionY !== undefined ? positionY : null,
      survival_time_ms: survivalTimeMs || 0,
      created_at: new Date()
    });

    // 2. Incrementar contador en progreso del jugador
    let progress = await db('player_progress').where({ user_id: userId }).first();
    if (!progress) {
      await db('player_progress').insert({
        user_id: userId,
        current_level: levelNumber,
        max_level_reached: levelNumber,
        total_deaths: 1,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await db('player_progress')
        .where({ user_id: userId })
        .increment('total_deaths', 1)
        .update({ updated_at: new Date() });
    }

    const updatedProgress = await db('player_progress').where({ user_id: userId }).first();

    // 3. Evaluar logro humorístico: "Víctima Inocente"
    // Regla: Morir durante el primer segundo de juego (<= 1000 ms) en el Nivel 1.
    const unlockedAchievements = [];
    if (levelNumber === 1 && survivalTimeMs && survivalTimeMs <= 1000) {
      const ach = await db('achievements').where({ code: 'victim_innocent' }).first();
      if (ach) {
        const alreadyHas = await db('user_achievements')
          .where({ user_id: userId, achievement_id: ach.id })
          .first();
        if (!alreadyHas) {
          await db('user_achievements').insert({
            user_id: userId,
            achievement_id: ach.id,
            unlocked_at: new Date()
          });
          unlockedAchievements.push(ach);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Muerte auditada en base de datos.',
      data: {
        totalDeaths: updatedProgress.total_deaths,
        unlockedAchievements
      }
    });
  } catch (error) {
    console.error('Error al registrar muerte:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al registrar la muerte.'
    });
  }
};

/**
 * Superar un nivel y avanzar el progreso en BD
 */
const completeLevel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { levelNumber } = req.body;

    if (!levelNumber || levelNumber < 1 || levelNumber > 50) {
      return res.status(400).json({
        success: false,
        error: 'Número de nivel inválido.'
      });
    }

    let progress = await db('player_progress').where({ user_id: userId }).first();
    const nextLevel = Math.min(50, levelNumber + 1);
    const newMax = Math.max(progress ? progress.max_level_reached : 1, nextLevel);
    const isGameFinished = (levelNumber === 50);

    if (!progress) {
      await db('player_progress').insert({
        user_id: userId,
        current_level: nextLevel,
        max_level_reached: newMax,
        total_deaths: 0,
        game_completed: isGameFinished,
        created_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await db('player_progress').where({ user_id: userId }).update({
        current_level: nextLevel,
        max_level_reached: newMax,
        game_completed: isGameFinished || progress.game_completed,
        updated_at: new Date()
      });
    }

    const unlockedAchievements = [];

    // Evaluar logro: "Leyenda de Level Trap" al derrotar el nivel 50
    if (isGameFinished) {
      const ach = await db('achievements').where({ code: 'legend_level_trap' }).first();
      if (ach) {
        const alreadyHas = await db('user_achievements')
          .where({ user_id: userId, achievement_id: ach.id })
          .first();
        if (!alreadyHas) {
          await db('user_achievements').insert({
            user_id: userId,
            achievement_id: ach.id,
            unlocked_at: new Date()
          });
          unlockedAchievements.push(ach);
        }
      }
    }

    const updated = await db('player_progress').where({ user_id: userId }).first();

    return res.status(200).json({
      success: true,
      message: isGameFinished ? '¡Juego completado con éxito!' : `Nivel ${levelNumber} superado.`,
      data: {
        progress: updated,
        unlockedAchievements
      }
    });
  } catch (error) {
    console.error('Error al completar nivel:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al actualizar el progreso del nivel.'
    });
  }
};

module.exports = {
  getProgress,
  getAllLevels,
  getLevel,
  registerDeath,
  completeLevel
};

