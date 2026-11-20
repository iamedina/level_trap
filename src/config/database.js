const path = require('path');
const fs = require('fs');
const Datastore = require('@seald-io/nedb');

// Asegurar directorio de datos local
const dataDir = path.resolve(__dirname, '../database/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicialización de Datastores locales en disco (CERO PROTOCOLOS, CERO MOCKS)
const createStore = (name) => {
  return new Datastore({
    filename: path.join(dataDir, `${name}.db`),
    autoload: true
  });
};

const db = {
  users: createStore('users'),
  levels: createStore('levels'),
  player_progress: createStore('player_progress'),
  death_logs: createStore('death_logs'),
  speedrun_records: createStore('speedrun_records'),
  achievements: createStore('achievements'),
  user_achievements: createStore('user_achievements'),
  daily_seeds: createStore('daily_seeds'),

  // Generador de IDs numéricos secuenciales seguro
  async getNextId(collectionName) {
    const store = db[collectionName];
    const docs = await store.findAsync({}).sort({ id: -1 }).limit(1);
    if (docs.length > 0 && typeof docs[0].id === 'number') {
      return docs[0].id + 1;
    }
    return 1;
  },

  // Inicialización y autoseeding de la base de datos
  async init() {
    // Índices de unicidad
    try {
      await db.users.ensureIndex({ fieldName: 'username', unique: true });
      await db.users.ensureIndex({ fieldName: 'email', unique: true });
      await db.levels.ensureIndex({ fieldName: 'level_number', unique: true });
      await db.achievements.ensureIndex({ fieldName: 'code', unique: true });
      await db.daily_seeds.ensureIndex({ fieldName: 'seed_date', unique: true });
    } catch (e) {
      // Índices ya configurados
    }

    // Auto-seed si la base de datos está vacía (ideal para despliegues remotos)
    try {
      const levelsCount = await db.levels.countAsync({});
      if (levelsCount === 0) {
        console.log('📦 Base de datos vacía detectada. Ejecutando auto-seed inicial...');
        const seedNeDB = require('../database/seed_nedb');
        await seedNeDB();
      }
    } catch (err) {
      console.error('Error durante el auto-seed:', err);
    }
  }
};

module.exports = db;
