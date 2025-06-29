/**
 * Middleware d'authentification JWT
 * Auteur: Manus AI
 */

const jwt = require('jsonwebtoken');
const { query, cache } = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Génère un token JWT pour un utilisateur
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'prevhub-api',
    audience: 'prevhub-client'
  });
};

/**
 * Vérifie un token JWT
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'prevhub-api',
      audience: 'prevhub-client'
    });
  } catch (error) {
    throw new Error('Token invalide');
  }
};

/**
 * Middleware d'authentification principal
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Récupération du token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token d\'authentification requis',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Supprime "Bearer "

    // Vérification du token en cache (blacklist)
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token révoqué',
        code: 'AUTH_TOKEN_REVOKED'
      });
    }

    // Décodage et vérification du token
    const decoded = verifyToken(token);

    // Vérification de l'utilisateur en base
    let user = await cache.get(`user:${decoded.id}`);
    if (!user) {
      const result = await query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Utilisateur non trouvé',
          code: 'AUTH_USER_NOT_FOUND'
        });
      }

      user = result.rows[0];
      // Mise en cache pour 1 heure
      await cache.set(`user:${decoded.id}`, user, 3600);
    }

    // Vérification que l'utilisateur est actif
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Compte utilisateur désactivé',
        code: 'AUTH_USER_INACTIVE'
      });
    }

    // Mise à jour de la dernière connexion
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Ajout des informations utilisateur à la requête
    req.user = user;
    req.token = token;

    // Log de l'accès
    logger.api('Accès authentifié', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.originalUrl}`
    });

    next();
  } catch (error) {
    logger.security('Erreur d\'authentification', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: `${req.method} ${req.originalUrl}`
    });

    return res.status(401).json({
      error: 'Token d\'authentification invalide',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

/**
 * Middleware de vérification des rôles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.security('Accès refusé - rôle insuffisant', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        endpoint: `${req.method} ${req.originalUrl}`
      });

      return res.status(403).json({
        error: 'Permissions insuffisantes',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Middleware optionnel (n'échoue pas si pas de token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      const result = await query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0];
        req.token = token;
      }
    }
  } catch (error) {
    // Ignore les erreurs pour l'auth optionnelle
  }
  
  next();
};

/**
 * Révoque un token (ajout à la blacklist)
 */
const revokeToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cache.set(`blacklist:${token}`, true, ttl);
      }
    }
    return true;
  } catch (error) {
    logger.error('Erreur révocation token:', error);
    return false;
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  optionalAuth,
  generateToken,
  verifyToken,
  revokeToken
};

