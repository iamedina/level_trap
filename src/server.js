require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const db = require('./config/database');

// Importación de Sockets y Rutas
const setupVersusSockets = require('./sockets/versus.socket');
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const speedrunRoutes = require('./routes/speedrun.routes');
const achievementRoutes = require('./routes/achievement.routes');
const seedRoutes = require('./routes/seed.routes');

const app = express();
const server = http.createServer(app);

// Configuración de WebSockets con Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Rate Limiting para Producción (Protección contra fuerza bruta y spam)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Máximo 300 peticiones por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Límite de peticiones excedido. Por favor, intenta más tarde.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 intentos de login/registro cada 15 min
  message: {
    success: false,
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  }
});

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Servir archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, '../public')));

// Montar Rutas de API REST (CERO MOCKS)
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/speedrun', speedrunRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/seed', seedRoutes);

// Endpoint de salud del sistema
app.get('/api/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    const levelsCount = await db('levels').count('id as count').first();
    const achievementsCount = await db('achievements').count('id as count').first();

    return res.status(200).json({
      success: true,
      message: 'Level Trap API & Database en línea',
      database: process.env.DB_CLIENT || 'sqlite3',
      environment: process.env.NODE_ENV || 'development',
      stats: {
        totalLevels: levelsCount.count,
        totalAchievements: achievementsCount.count
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error de conexión con la base de datos',
      details: error.message
    });
  }
});

// Manejador 404 para endpoints no encontrados
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Inicializar Motor de WebSockets para Versus 1v1 y Daily Seed
setupVersusSockets(io, db);

app.set('io', io);

// Iniciar Servidor si se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🎮 LEVEL TRAP - Servidor Activo en http://localhost:${PORT}`);
    console.log(`🗄️  Base de Datos: ${process.env.DB_CLIENT || 'sqlite3'}`);
    console.log(`⚔️  WebSockets Versus 1v1 & Daily Seed inicializados`);
    console.log(`⚡ Endpoints Core Activos: /api/auth, /api/game, /api/speedrun, /api/achievements, /api/seed`);
    console.log(`====================================================`);
  });
}

module.exports = { app, server, io };
