const db = require('../config/database');

/**
 * Listar catálogo de logros con estado de desbloqueo del usuario actual
 */
const listAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    const allAchievements = await db('achievements')
      .select('id', 'code', 'name', 'description', 'icon')
      .orderBy('id', 'asc');

    const userUnlocked = await db('user_achievements')
      .where({ user_id: userId })
      .select('achievement_id', 'unlocked_at');

    const unlockedMap = new Map();
    userUnlocked.forEach((u) => {
      unlockedMap.set(u.achievement_id, u.unlocked_at);
    });

    const result = allAchievements.map((ach) => ({
      id: ach.id,
      code: ach.code,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      isUnlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null
    }));

    const totalUnlocked = userUnlocked.length;

    return res.status(200).json({
      success: true,
      data: {
        total: allAchievements.length,
        totalUnlocked,
        achievements: result
      }
    });
  } catch (error) {
    console.error('Error al listar logros:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar los logros.'
    });
  }
};

/**
 * Auditar y desbloquear un logro específico para el usuario en la BD
 */
const unlockAchievement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'El código del logro (code) es requerido.'
      });
    }

    const achievement = await db('achievements').where({ code }).first();

    if (!achievement) {
      return res.status(404).json({
        success: false,
        error: `El logro con código '${code}' no existe en el catálogo.`
      });
    }

    // Verificar si ya fue desbloqueado
    const alreadyUnlocked = await db('user_achievements')
      .where({ user_id: userId, achievement_id: achievement.id })
      .first();

    if (alreadyUnlocked) {
      return res.status(200).json({
        success: true,
        message: 'El logro ya se encontraba desbloqueado previamente.',
        data: {
          achievement,
          unlockedAt: alreadyUnlocked.unlocked_at,
          isNew: false
        }
      });
    }

    // Registrar en BD
    const now = new Date();
    await db('user_achievements').insert({
      user_id: userId,
      achievement_id: achievement.id,
      unlocked_at: now
    });

    return res.status(201).json({
      success: true,
      message: `¡Logro desbloqueado: ${achievement.name}!`,
      data: {
        achievement,
        unlockedAt: now,
        isNew: true
      }
    });
  } catch (error) {
    console.error('Error al desbloquear logro:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al auditar el desbloqueo del logro.'
    });
  }
};

module.exports = {
  listAchievements,
  unlockAchievement
};

