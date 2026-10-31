/**
 * Seed: 6 Logros Humorísticos Oficiales de LEVEL TRAP
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Evitar duplicados si ya existen
  const achievements = [
    {
      code: 'victim_innocent',
      name: 'Víctima Inocente',
      description: 'Morir durante el primer segundo de juego en el Nivel 1.',
      icon: '🪦'
    },
    {
      code: 'total_paranoia',
      name: 'Paranoia Total',
      description: 'Saltar 10 veces consecutivas en el mismo bloque antes de avanzar.',
      icon: '👀'
    },
    {
      code: 'unstoppable',
      name: 'Imparable',
      description: 'Superar 5 niveles consecutivos sin acumular muertes.',
      icon: '⚡'
    },
    {
      code: 'impostor',
      name: 'Impostor',
      description: 'Intentar entrar en 3 puertas falsas distintas.',
      icon: '🚪'
    },
    {
      code: 'gravity_master',
      name: 'Maestro de la Gravedad',
      description: 'Sobrevivir 30 segundos seguidos en gravedad invertida.',
      icon: '🔄'
    },
    {
      code: 'legend_level_trap',
      name: 'Leyenda de Level Trap',
      description: 'Derrotar al Jefe Final del Nivel 50 y completar el juego.',
      icon: '👑'
    }
  ];

  for (const ach of achievements) {
    const exists = await knex('achievements').where({ code: ach.code }).first();
    if (!exists) {
      await knex('achievements').insert(ach);
    }
  }
};

