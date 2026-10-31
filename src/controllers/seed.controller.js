const db = require('../config/database');

/**
 * Obtener o generar la Semilla Diaria (Daily Seed)
 */
const getDailySeed = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    let dailyRecord = await db('daily_seeds').where({ seed_date: today }).first();

    if (!dailyRecord) {
      // Generar semilla determinista basada en la fecha
      let seedValue = 0;
      for (let i = 0; i < today.length; i++) {
        seedValue = (seedValue * 31 + today.charCodeAt(i)) % 1000000;
      }

      const dailyConfig = {
        seedDate: today,
        trapSpeedMultiplier: 1.0 + ((seedValue % 5) * 0.05),
        bonusPointsFactor: 1.2,
        specialRule: (seedValue % 2 === 0) ? 'Double Spike Velocity' : 'Low Friction Platforms'
      };

      const [newId] = await db('daily_seeds').insert({
        seed_date: today,
        seed_value: seedValue,
        config: JSON.stringify(dailyConfig),
        created_at: new Date()
      });

      dailyRecord = await db('daily_seeds').where({ id: newId }).first();
    }

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(dailyRecord.config);
    } catch (e) {
      parsedConfig = {};
    }

    return res.status(200).json({
      success: true,
      data: {
        date: dailyRecord.seed_date,
        seedValue: dailyRecord.seed_value,
        config: parsedConfig
      }
    });
  } catch (error) {
    console.error('Error al obtener Daily Seed:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar la semilla diaria.'
    });
  }
};

module.exports = {
  getDailySeed
};

