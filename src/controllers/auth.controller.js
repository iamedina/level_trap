const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
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

    // Verificar si el usuario o email ya existen en la base de datos real
    const existingUser = await db('users')
      .where('username', trimmedUsername)
      .orWhere('email', trimmedEmail)
      .first();

    if (existingUser) {
      if (existingUser.username === trimmedUsername) {
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

    const [newUserId] = await db('users').insert({
      username: trimmedUsername,
      email: trimmedEmail,
      password_hash,
      created_at: new Date(),
      updated_at: new Date()
    });

    const token = generateToken(newUserId);

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente en Level Trap.',
      data: {
        user: {
          id: newUserId,
          username: trimmedUsername,
          email: trimmedEmail
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al registrar el usuario.'
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, ingresa tu usuario o correo y contraseña.'
      });
    }

    const trimmedIdentifier = identifier.trim();

    // Búsqueda por username o email
    const user = await db('users')
      .where('username', trimmedIdentifier)
      .orWhere('email', trimmedIdentifier.toLowerCase())
      .first();

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

    const token = generateToken(user.id);

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

