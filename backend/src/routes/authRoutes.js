/**
 * Routes d'authentification sécurisées
 */
const express = require('express');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/authJWT');
const logger = require('../utils/logger');

const router = express.Router();

// Utilisateurs en mémoire (à remplacer par une base de données)
const users = [
  {
    id: 1,
    email: 'admin@preveris.fr',
    password: '$2b$10$rQJ8kHqGZxKjGx5QJ8kHqGZxKjGx5QJ8kHqGZxKjGx5QJ8kHqGZxK', // password: admin123
    firstName: 'Admin',
    lastName: 'Prévéris',
    role: 'admin'
  },
  {
    id: 2,
    email: 'manager@preveris.fr',
    password: '$2b$10$rQJ8kHqGZxKjGx5QJ8kHqGZxKjGx5QJ8kHqGZxKjGx5QJ8kHqGZxK', // password: manager123
    firstName: 'Manager',
    lastName: 'Prévéris',
    role: 'manager'
  }
];

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Recherche de l'utilisateur
    const user = users.find(u => u.email === email);
      logger.warn(`Tentative de connexion échouée pour: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Vérification du mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
      logger.warn(`Mot de passe incorrect pour: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Génération du token JWT
    const token = generateToken(user);

    logger.info(`Connexion réussie pour: ${email}`);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/authJWT').verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

module.exports = router;
