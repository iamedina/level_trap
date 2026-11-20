require('dotenv').config();
const path = require('path');

const dbClient = process.env.DB_CLIENT || 'sqlite3';

const config = {
  development: {
    client: dbClient,
    connection: dbClient === 'sqlite3'
      ? { filename: path.resolve(__dirname, process.env.DB_FILENAME || './src/database/level_trap.sqlite') }
      : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'level_trap_db'
      },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, './src/database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, './src/database/seeds')
    },
    pool: dbClient === 'sqlite3' ? {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    } : { min: 2, max: 10 }
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
      ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Requerido por Render para conexiones PostgreSQL seguras
      }
      : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
    migrations: {
      directory: path.resolve(__dirname, './src/database/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, './src/database/seeds')
    },
    pool: { min: 2, max: 10 }
  }
};

module.exports = config;