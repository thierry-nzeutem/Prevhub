/**
 * Routes de gestion des utilisateurs
 * Auteur: Manus AI
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, manager, user, preventionist, commercial]
 *         is_active:
 *           type: boolean
 *         last_login:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Liste des utilisateurs
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom ou email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtrer par rôle
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', [
  requireRole(['admin', 'manager']),
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  queryValidator('search').optional().trim().escape(),
  queryValidator('role').optional().isIn(['admin', 'manager', 'user', 'preventionist', 'commercial']),
  queryValidator('active').optional().isBoolean().toBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Paramètres invalides', errors.array());
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;
  const { search, role, active } = req.query;

  // Construction de la requête avec filtres
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    whereConditions.push(`role = $${paramIndex}`);
    queryParams.push(role);
    paramIndex++;
  }

  if (active !== undefined) {
    whereConditions.push(`is_active = $${paramIndex}`);
    queryParams.push(active);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Requête pour le total
  const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  // Requête pour les données
  const dataQuery = `
    SELECT id, email, first_name, last_name, phone, role, is_active, 
           last_login, created_at, updated_at
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const result = await query(dataQuery, queryParams);

  res.json({
    users: result.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Détails d'un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get('/:id', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, email, first_name, last_name, phone, role, is_active, 
            last_login, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  res.json(result.rows[0]);
}));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user, preventionist, commercial]
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Email déjà utilisé
 */
router.post('/', [
  requireRole(['admin']),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Prénom requis (1-100 caractères)'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom requis (1-100 caractères)'),
  body('phone')
    .optional()
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone français valide requis'),
  body('role')
    .isIn(['admin', 'manager', 'user', 'preventionist', 'commercial'])
    .withMessage('Rôle invalide')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { email, password, first_name, last_name, phone, role } = req.body;

  // Vérification de l'unicité de l'email
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw ErrorTypes.CONFLICT('Cette adresse email est déjà utilisée');
  }

  // Hashage du mot de passe
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Création de l'utilisateur
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
    [email, passwordHash, first_name, last_name, phone, role]
  );

  const newUser = result.rows[0];

  logger.audit('Création utilisateur', {
    createdUserId: newUser.id,
    createdUserEmail: newUser.email,
    createdUserRole: newUser.role,
    createdBy: req.user.id,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Utilisateur créé avec succès',
    user: newUser
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Modifier un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user, preventionist, commercial]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Utilisateur modifié avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       409:
 *         description: Email déjà utilisé
 */
router.put('/:id', [
  requireRole(['admin']),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Prénom requis (1-100 caractères)'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom requis (1-100 caractères)'),
  body('phone')
    .optional()
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone français valide requis'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'user', 'preventionist', 'commercial'])
    .withMessage('Rôle invalide'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Statut actif doit être un booléen')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { id } = req.params;
  const updates = req.body;

  // Vérification que l'utilisateur existe
  const existingUser = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  // Vérification de l'unicité de l'email si modifié
  if (updates.email && updates.email !== existingUser.rows[0].email) {
    const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [updates.email, id]);
    if (emailCheck.rows.length > 0) {
      throw ErrorTypes.CONFLICT('Cette adresse email est déjà utilisée');
    }
  }

  // Construction de la requête de mise à jour
  const updateFields = [];
  const queryParams = [];
  let paramIndex = 1;

  Object.keys(updates).forEach(field => {
    if (['email', 'first_name', 'last_name', 'phone', 'role', 'is_active'].includes(field)) {
      updateFields.push(`${field} = $${paramIndex}`);
      queryParams.push(updates[field]);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    throw ErrorTypes.BAD_REQUEST('Aucune donnée à mettre à jour');
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  queryParams.push(id);

  const updateQuery = `
    UPDATE users 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, email, first_name, last_name, phone, role, is_active, updated_at
  `;

  const result = await query(updateQuery, queryParams);

  logger.audit('Modification utilisateur', {
    modifiedUserId: id,
    modifiedFields: Object.keys(updates),
    modifiedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Utilisateur modifié avec succès',
    user: result.rows[0]
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       400:
 *         description: Impossible de supprimer cet utilisateur
 */
router.delete('/:id', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Vérification que l'utilisateur existe
  const existingUser = await query('SELECT email, role FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  // Empêcher la suppression de son propre compte
  if (id === req.user.id) {
    throw ErrorTypes.BAD_REQUEST('Impossible de supprimer votre propre compte');
  }

  // Vérification des dépendances (projets assignés, etc.)
  const dependencies = await query(
    'SELECT COUNT(*) FROM projects WHERE assigned_user_id = $1',
    [id]
  );

  if (parseInt(dependencies.rows[0].count) > 0) {
    throw ErrorTypes.BAD_REQUEST('Impossible de supprimer un utilisateur ayant des projets assignés');
  }

  // Suppression de l'utilisateur
  await query('DELETE FROM users WHERE id = $1', [id]);

  logger.audit('Suppression utilisateur', {
    deletedUserId: id,
    deletedUserEmail: existingUser.rows[0].email,
    deletedUserRole: existingUser.rows[0].role,
    deletedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Utilisateur supprimé avec succès'
  });
}));

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe d'un utilisateur
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post('/:id/reset-password', [
  requireRole(['admin']),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { id } = req.params;
  const { newPassword } = req.body;

  // Vérification que l'utilisateur existe
  const existingUser = await query('SELECT email FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Utilisateur');
  }

  // Hashage du nouveau mot de passe
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Mise à jour du mot de passe
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );

  logger.audit('Réinitialisation mot de passe', {
    targetUserId: id,
    targetUserEmail: existingUser.rows[0].email,
    resetBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Mot de passe réinitialisé avec succès'
  });
}));

module.exports = router;

