const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// El token lleva la identidad firmada para que la sesión sobreviva a un
// reinicio del datastore local (Render reinicia el disco en cada deploy).
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'super_secret_jwt_key_level_trap_2026_production_ready',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validaciones de entrada
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos (nombre de usuario, correo y contraseña) son obligatorios.'
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario debe tener entre 3 y 30 caracteres.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El formato de correo electrónico es inválido.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe contener al menos 6 caracteres.'
      });
    }

    // Verificar si el usuario o email ya existen en la base de datos local
    const escapedUsername = trimmedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingUser = await db.users.findOneAsync({
      $or: [
        { username: trimmedUsername },
        { username: new RegExp(`^${escapedUsername}$`, 'i') },
        { email: trimmedEmail }
      ]
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        return res.status(409).json({
          success: false,
          error: 'El nombre de usuario ya está registrado por otro jugador.'
        });
      }
      return res.status(409).json({
        success: false,
        error: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    // Hashing seguro de contraseña con bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newUserId = await db.getNextId('users');

    const newUser = await db.users.insertAsync({
      id: newUserId,
      username: trimmedUsername,
      email: trimmedEmail,
      password_hash,
      created_at: new Date(),
      updated_at: new Date()
    });

    const token = generateToken({
      id: newUser.id,
      username: trimmedUsername,
      email: trimmedEmail
    });

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente en Level Trap.',
      data: {
        user: {
          id: newUser.id,
          username: trimmedUsername,
          email: trimmedEmail
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    if (error.errorType === 'uniqueViolated' || error.key) {
      return res.status(409).json({
        success: false,
        error: 'El nombre de usuario o correo electrónico ya se encuentra registrado.'
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor al registrar el usuario.'
    });
  }
};

const login = async (req, res) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.username || req.body.email;
    const { password } = req.body;

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, ingresa tu usuario o correo y contraseña.'
      });
    }

    const trimmedIdentifier = rawIdentifier.trim();

    // Búsqueda por username o email
    const user = await db.users.findOneAsync({
      $or: [{ username: trimmedIdentifier }, { email: trimmedIdentifier.toLowerCase() }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Verifica tu usuario y contraseña.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Verifica tu usuario y contraseña.'
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email
    });

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al procesar el inicio de sesión.'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar el perfil del usuario.'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
