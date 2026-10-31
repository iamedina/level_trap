/**
 * Migration: Create Game Entities for LEVEL TRAP
 * Core Tables: levels, player_progress, death_logs, speedrun_records, achievements, user_achievements, daily_seeds
 * Compatible with SQLite3 and PostgreSQL
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Tabla de Niveles (50 niveles con zonas y especificaciones)
  const hasLevels = await knex.schema.hasTable('levels');
  if (!hasLevels) {
    await knex.schema.createTable('levels', (table) => {
      table.increments('id').primary();
      table.integer('level_number').notNullable().unique().index();
      table.integer('zone_id').notNullable(); // 1: Tierra/Arena, 2: Volcán/Lava, 3: Inframundo
      table.string('zone_name', 50).notNullable();
      table.string('title', 100).notNullable();
      table.boolean('is_boss_level').defaultTo(false);
      table.text('data').notNullable(); // JSON: spawn, exitDoor, platforms, traps, bossConfig
      table.integer('base_time_ms').defaultTo(60000); // Tiempo base de referencia para el cálculo de puntos
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 2. Tabla de Progreso del Jugador
  const hasProgress = await knex.schema.hasTable('player_progress');
  if (!hasProgress) {
    await knex.schema.createTable('player_progress', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      table.integer('current_level').defaultTo(1);
      table.integer('max_level_reached').defaultTo(1);
      table.integer('total_deaths').defaultTo(0);
      table.boolean('game_completed').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 3. Tabla de Registro de Muertes
  const hasDeathLogs = await knex.schema.hasTable('death_logs');
  if (!hasDeathLogs) {
    await knex.schema.createTable('death_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('level_number').notNullable().index();
      table.string('trap_type', 50).notNullable(); // 'spikes', 'fake_floor', 'boss_projectile', etc.
      table.float('position_x').nullable();
      table.float('position_y').nullable();
      table.integer('survival_time_ms').nullable(); // Tiempo sobrevivido en el intento
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 4. Tabla de Récords de Speedrun y Ghost Engine
  const hasSpeedrun = await knex.schema.hasTable('speedrun_records');
  if (!hasSpeedrun) {
    await knex.schema.createTable('speedrun_records', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('level_number').notNullable().index(); // 0 = Full Game Run, 1..50 = Individual Level
      table.integer('time_ms').notNullable();
      table.integer('deaths').defaultTo(0);
      table.integer('score').notNullable();
      table.text('ghost_data').nullable(); // JSON: array de [t, x, y, dir, state]
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 5. Tabla de Logros Humorísticos
  const hasAchievements = await knex.schema.hasTable('achievements');
  if (!hasAchievements) {
    await knex.schema.createTable('achievements', (table) => {
      table.increments('id').primary();
      table.string('code', 50).notNullable().unique();
      table.string('name', 100).notNullable();
      table.text('description').notNullable();
      table.string('icon', 20).defaultTo('🏆');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 6. Tabla de Logros Desbloqueados por Usuario
  const hasUserAchievements = await knex.schema.hasTable('user_achievements');
  if (!hasUserAchievements) {
    await knex.schema.createTable('user_achievements', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('achievement_id').unsigned().notNullable().references('id').inTable('achievements').onDelete('CASCADE');
      table.timestamp('unlocked_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'achievement_id']);
    });
  }

  // 7. Tabla de Semilla Diaria (Daily Seed)
  const hasDailySeeds = await knex.schema.hasTable('daily_seeds');
  if (!hasDailySeeds) {
    await knex.schema.createTable('daily_seeds', (table) => {
      table.increments('id').primary();
      table.string('seed_date', 10).notNullable().unique(); // YYYY-MM-DD
      table.integer('seed_value').notNullable();
      table.text('config').nullable(); // JSON con modificadores del día
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('daily_seeds');
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievements');
  await knex.schema.dropTableIfExists('speedrun_records');
  await knex.schema.dropTableIfExists('death_logs');
  await knex.schema.dropTableIfExists('player_progress');
  await knex.schema.dropTableIfExists('levels');
};

