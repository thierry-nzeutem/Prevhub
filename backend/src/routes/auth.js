/**
 * Routes d'authentification
 * Auteur: Manus AI
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, cache } = require('../config/database');
const { generateToken, revokeToken, authMiddleware } = require('../middleware/auth');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Adresse email de l'utilisateur
 *         password:
 *           type: string
 *           description: Mot de passe de l'utilisateur
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT d'authentification
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *             first_name:
 *               type: string
 *             last_name:
 *               type: string
 *             role:
 *               type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants invalides
 *       400:
 *         description: Données de requête invalides
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Mot de passe requis')
], asyncHandler(async (req, res) => {
  // Validation des données
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { email, password } = req.body;

  // Recherche de l'utilisateur
  const result = await query(
    `SELECT id, email, password_hash, first_name, last_name, role, is_active 
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    logger.security('Tentative de connexion avec email inexistant', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw ErrorTypes.UNAUTHORIZED('Identifiants invalides');
  }

  const user = result.rows[0];

  // Vérification que le compte est actif
  if (!user.is_active) {
    logger.security('Tentative de connexion sur compte désactivé', {
      userId: user.id,
      email,
      ip: req.ip
    });
    throw ErrorTypes.UNAUTHORIZED('Compte désactivé');
  }

  // Vérification du mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    logger.security('Tentative de connexion avec mot de passe incorrect', {
      userId: user.id,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw ErrorTypes.UNAUTHORIZED('Identifiants invalides');
  }

  // Génération du token
  const token = generateToken(user);

  // Mise à jour de la dernière connexion
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Mise en cache des informations utilisateur
  const userCache = {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_active: user.is_active
  };
  await cache.set(`user:${user.id}`, userCache, 3600);

  // Log de connexion réussie
  logger.audit('Connexion réussie', {
    userId: user.id,
    email: user.email,
    role: user.role,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Réponse (sans le hash du mot de passe)
  const { password_hash, ...userResponse } = user;
  res.json({
    message: 'Connexion réussie',
    token,
    user: userResponse
  });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion utilisateur
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Non authentifié
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // Révocation du token
  await revokeToken(req.token);

  // Suppression du cache utilisateur
  await cache.del(`user:${req.user.id}`);

  logger.audit('Déconnexion', {
    userId: req.user.id,
    email: req.user.email,
    ip: req.ip
  });

  res.json({
    message: 'Déconnexion réussie'
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Informations utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     last_login:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  // Récupération des informations complètes de l'utilisateur
  const result = await query(
    `SELECT id, email, first_name, last_name, phone, role, is_active, 
            last_login, created_at, updated_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  res.json({
    user: result.rows[0]
  });
}));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Changement de mot de passe
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Mot de passe actuel
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Nouveau mot de passe
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Mot de passe actuel incorrect
 */
router.post('/change-password', [
  authMiddleware,
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  // Récupération du hash actuel
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  // Vérification du mot de passe actuel
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isCurrentPasswordValid) {
    logger.security('Tentative de changement de mot de passe avec mot de passe incorrect', {
      userId: req.user.id,
      ip: req.ip
    });
    throw ErrorTypes.UNAUTHORIZED('Mot de passe actuel incorrect');
  }

  // Hashage du nouveau mot de passe
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Mise à jour en base
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, req.user.id]
  );

  logger.audit('Changement de mot de passe', {
    userId: req.user.id,
    email: req.user.email,
    ip: req.ip
  });

  res.json({
    message: 'Mot de passe changé avec succès'
  });
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchissement du token
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nouveau token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Token invalide
 */
router.post('/refresh', authMiddleware, asyncHandler(async (req, res) => {
  // Génération d'un nouveau token
  const newToken = generateToken(req.user);

  // Révocation de l'ancien token
  await revokeToken(req.token);

  logger.audit('Rafraîchissement de token', {
    userId: req.user.id,
    email: req.user.email,
    ip: req.ip
  });

  res.json({
    message: 'Token rafraîchi',
    token: newToken,
    user: req.user
  });
}));

module.exports = router;

