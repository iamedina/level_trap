const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso no autorizado: Token no proporcionado.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_level_trap_2026_production_ready');
    const user = await db.users.findOneAsync({ id: decoded.userId });

    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
    } else if (decoded.username && decoded.email) {
      // Sesión firmada válida pero el datastore local fue reiniciado
      // (disco efímero de Render). La identidad firmada basta para seguir
      // autenticado; el progreso se reinicializa en /api/game/progress.
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email
      };
    } else {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o sesión inválida.'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'La sesión ha expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Token inválido o corrupto.'
    });
  }
};

module.exports = authenticateToken;
