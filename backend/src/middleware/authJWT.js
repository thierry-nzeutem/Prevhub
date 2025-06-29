/**
 * Middleware d'authentification JWT avancé
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'prevhub_jwt_secret_key_very_long_and_secure_2024';

// Middleware de vérification JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification requis'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    logger.info(`Utilisateur authentifié: ${decoded.email} (ID: ${decoded.id})`);
    next();
  } catch (error) {
    logger.warn(`Token invalide: ${error.message}`);
    return res.status(403).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

// Middleware de vérification des rôles
const requireRole = (roles) => {
  return (req, res, next) => {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    next();
  };
};

// Génération de token JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  verifyToken,
  requireRole,
  generateToken
};
