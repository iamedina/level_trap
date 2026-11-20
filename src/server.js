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
const NODE_ENV = process.env.NODE_ENV || 'development';

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

// Montar Rutas de API REST
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/speedrun', speedrunRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/seed', seedRoutes);

// Endpoint de salud del sistema
app.get('/api/health', async (req, res) => {
  try {
    const levelsCount = await db.levels.countAsync({});
    const achievementsCount = await db.achievements.countAsync({});

    return res.status(200).json({
      success: true,
      message: 'Level Trap API & Database en línea',
      database: 'nedb-embedded',
      environment: NODE_ENV,
      stats: {
        totalLevels: levelsCount,
        totalAchievements: achievementsCount
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

// Iniciar Servidor con inicialización previa de colecciones
async function startServer() {
  await db.init();
  if (NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🎮 LEVEL TRAP - Servidor Activo en Puerto ${PORT}`);
      console.log(`🌍 Entorno: ${NODE_ENV}`);
      console.log(`🗄️  Base de Datos: NeDB Embedded (Zero Remote Protocols, Disk Persisted)`);
      console.log(`⚔️  WebSockets Versus 1v1 & Daily Seed inicializados`);
      console.log(`⚡ Endpoints Core Activos: /api/auth, /api/game, /api/speedrun, /api/achievements, /api/seed`);
      console.log(`====================================================`);
    });
  }
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
});

module.exports = { app, server, io };
