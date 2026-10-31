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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users').where({ id: decoded.userId }).first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o sesión inválida.'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

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

