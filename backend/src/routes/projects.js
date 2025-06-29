/**
 * Routes de gestion des projets/missions
 * Auteur: Manus AI
 */

const express = require('express');
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
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         contact_id:
 *           type: string
 *           format: uuid
 *         assigned_user_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [ERP, IGH, ACCESSIBILITE]
 *         status:
 *           type: string
 *           enum: [DRAFT, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED]
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         start_date:
 *           type: string
 *           format: date
 *         due_date:
 *           type: string
 *           format: date
 *         completion_date:
 *           type: string
 *           format: date
 *         budget:
 *           type: number
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Liste des projets
 *     tags: [Projets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom ou description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, IN_PROGRESS, REVIEW, COMPLETED, CANCELLED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ERP, IGH, ACCESSIBILITE]
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des projets
 */
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  queryValidator('search').optional().trim().escape(),
  queryValidator('status').optional().isIn(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']),
  queryValidator('type').optional().isIn(['ERP', 'IGH', 'ACCESSIBILITE']),
  queryValidator('assigned_to').optional().isUUID(),
  queryValidator('organization_id').optional().isUUID()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Paramètres invalides', errors.array());
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;
  const { search, status, type, assigned_to, organization_id } = req.query;

  // Construction de la requête avec filtres
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Filtrage par rôle utilisateur
  if (req.user.role === 'user' || req.user.role === 'preventionist') {
    whereConditions.push(`p.assigned_user_id = $${paramIndex}`);
    queryParams.push(req.user.id);
    paramIndex++;
  }

  if (search) {
    whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`p.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (type) {
    whereConditions.push(`p.type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  if (assigned_to) {
    whereConditions.push(`p.assigned_user_id = $${paramIndex}`);
    queryParams.push(assigned_to);
    paramIndex++;
  }

  if (organization_id) {
    whereConditions.push(`p.organization_id = $${paramIndex}`);
    queryParams.push(organization_id);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Requête pour le total
  const countQuery = `SELECT COUNT(*) FROM projects p ${whereClause}`;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  // Requête pour les données
  const dataQuery = `
    SELECT p.*, 
           o.name as organization_name,
           c.first_name as contact_first_name,
           c.last_name as contact_last_name,
           u.first_name as assigned_user_first_name,
           u.last_name as assigned_user_last_name,
           (SELECT COUNT(*) FROM documents WHERE project_id = p.id) as documents_count,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as tasks_count,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'DONE') as pending_tasks_count
    FROM projects p
    LEFT JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN contacts c ON p.contact_id = c.id
    LEFT JOIN users u ON p.assigned_user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const result = await query(dataQuery, queryParams);

  res.json({
    projects: result.rows,
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
 * /api/projects/{id}:
 *   get:
 *     summary: Détails d'un projet
 *     tags: [Projets]
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
 *         description: Détails du projet
 *       404:
 *         description: Projet non trouvé
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Récupération du projet avec toutes les informations liées
  const projectResult = await query(`
    SELECT p.*, 
           o.name as organization_name,
           o.address as organization_address,
           o.city as organization_city,
           o.postal_code as organization_postal_code,
           c.first_name as contact_first_name,
           c.last_name as contact_last_name,
           c.email as contact_email,
           c.phone as contact_phone,
           u.first_name as assigned_user_first_name,
           u.last_name as assigned_user_last_name,
           u.email as assigned_user_email
    FROM projects p
    LEFT JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN contacts c ON p.contact_id = c.id
    LEFT JOIN users u ON p.assigned_user_id = u.id
    WHERE p.id = $1
  `, [id]);

  if (projectResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Projet');
  }

  const project = projectResult.rows[0];

  // Vérification des permissions
  if ((req.user.role === 'user' || req.user.role === 'preventionist') && 
      project.assigned_user_id !== req.user.id) {
    throw ErrorTypes.FORBIDDEN('Accès non autorisé à ce projet');
  }

  // Récupération des documents
  const documentsResult = await query(`
    SELECT d.*, u.first_name as uploaded_by_first_name, u.last_name as uploaded_by_last_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.project_id = $1
    ORDER BY d.created_at DESC
  `, [id]);

  // Récupération des tâches
  const tasksResult = await query(`
    SELECT t.*, 
           u1.first_name as assigned_to_first_name, u1.last_name as assigned_to_last_name,
           u2.first_name as created_by_first_name, u2.last_name as created_by_last_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    WHERE t.project_id = $1
    ORDER BY t.created_at DESC
  `, [id]);

  // Récupération des devis
  const quotesResult = await query(`
    SELECT q.*, COUNT(ql.id) as lines_count
    FROM quotes q
    LEFT JOIN quote_lines ql ON q.id = ql.quote_id
    WHERE q.project_id = $1
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `, [id]);

  project.documents = documentsResult.rows;
  project.tasks = tasksResult.rows;
  project.quotes = quotesResult.rows;

  res.json(project);
}));

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Créer un nouveau projet
 *     tags: [Projets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - organization_id
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *               contact_id:
 *                 type: string
 *                 format: uuid
 *               assigned_user_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [ERP, IGH, ACCESSIBILITE]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               start_date:
 *                 type: string
 *                 format: date
 *               due_date:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Projet créé avec succès
 */
router.post('/', [
  requireRole(['admin', 'manager', 'commercial']),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom du projet requis (1-255 caractères)'),
  body('organization_id')
    .isUUID()
    .withMessage('ID d\'organisation valide requis'),
  body('contact_id')
    .optional()
    .isUUID()
    .withMessage('ID de contact invalide'),
  body('assigned_user_id')
    .optional()
    .isUUID()
    .withMessage('ID d\'utilisateur assigné invalide'),
  body('type')
    .isIn(['ERP', 'IGH', 'ACCESSIBILITE'])
    .withMessage('Type de projet invalide'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priorité invalide'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Date d\'échéance invalide'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget doit être un nombre positif')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const {
    name, description, organization_id, contact_id, assigned_user_id,
    type, priority, start_date, due_date, budget
  } = req.body;

  // Vérification que l'organisation existe
  const orgExists = await query('SELECT id FROM organizations WHERE id = $1', [organization_id]);
  if (orgExists.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Organisation');
  }

  // Vérification que le contact appartient à l'organisation si fourni
  if (contact_id) {
    const contactExists = await query(
      'SELECT id FROM contacts WHERE id = $1 AND organization_id = $2',
      [contact_id, organization_id]
    );
    if (contactExists.rows.length === 0) {
      throw ErrorTypes.BAD_REQUEST('Le contact ne correspond pas à l\'organisation');
    }
  }

  // Vérification que l'utilisateur assigné existe si fourni
  if (assigned_user_id) {
    const userExists = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [assigned_user_id]);
    if (userExists.rows.length === 0) {
      throw ErrorTypes.NOT_FOUND('Utilisateur assigné');
    }
  }

  // Création du projet
  const result = await query(
    `INSERT INTO projects (name, description, organization_id, contact_id, assigned_user_id, 
                          type, priority, start_date, due_date, budget)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      name,
      description || null,
      organization_id,
      contact_id || null,
      assigned_user_id || null,
      type,
      priority || 'MEDIUM',
      start_date || null,
      due_date || null,
      budget || null
    ]
  );

  const project = result.rows[0];

  logger.audit('Création projet', {
    projectId: project.id,
    projectName: project.name,
    organizationId: organization_id,
    createdBy: req.user.id,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Projet créé avec succès',
    project
  });
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Modifier un projet
 *     tags: [Projets]
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
 *         description: Projet modifié avec succès
 */
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom du projet requis (1-255 caractères)'),
  body('contact_id')
    .optional()
    .isUUID()
    .withMessage('ID de contact invalide'),
  body('assigned_user_id')
    .optional()
    .isUUID()
    .withMessage('ID d\'utilisateur assigné invalide'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'])
    .withMessage('Statut invalide'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priorité invalide'),
  body('completion_date')
    .optional()
    .isISO8601()
    .withMessage('Date de completion invalide')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { id } = req.params;
  const updates = req.body;

  // Vérification que le projet existe
  const existingProject = await query('SELECT * FROM projects WHERE id = $1', [id]);
  if (existingProject.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Projet');
  }

  const project = existingProject.rows[0];

  // Vérification des permissions
  if ((req.user.role === 'user' || req.user.role === 'preventionist') && 
      project.assigned_user_id !== req.user.id) {
    throw ErrorTypes.FORBIDDEN('Accès non autorisé à ce projet');
  }

  // Vérifications spécifiques
  if (updates.contact_id) {
    const contactExists = await query(
      'SELECT id FROM contacts WHERE id = $1 AND organization_id = $2',
      [updates.contact_id, project.organization_id]
    );
    if (contactExists.rows.length === 0) {
      throw ErrorTypes.BAD_REQUEST('Le contact ne correspond pas à l\'organisation');
    }
  }

  if (updates.assigned_user_id) {
    const userExists = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [updates.assigned_user_id]);
    if (userExists.rows.length === 0) {
      throw ErrorTypes.NOT_FOUND('Utilisateur assigné');
    }
  }

  // Si le statut passe à COMPLETED, ajouter la date de completion
  if (updates.status === 'COMPLETED' && !project.completion_date) {
    updates.completion_date = new Date().toISOString().split('T')[0];
  }

  // Construction de la requête de mise à jour
  const updateFields = [];
  const queryParams = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'description', 'contact_id', 'assigned_user_id', 'status', 
    'priority', 'start_date', 'due_date', 'completion_date', 'budget'
  ];
  
  Object.keys(updates).forEach(field => {
    if (allowedFields.includes(field)) {
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
    UPDATE projects 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(updateQuery, queryParams);

  logger.audit('Modification projet', {
    projectId: id,
    modifiedFields: Object.keys(updates),
    modifiedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Projet modifié avec succès',
    project: result.rows[0]
  });
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Supprimer un projet
 *     tags: [Projets]
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
 *         description: Projet supprimé avec succès
 */
router.delete('/:id', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Vérification que le projet existe
  const existingProject = await query('SELECT name FROM projects WHERE id = $1', [id]);
  if (existingProject.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Projet');
  }

  // Vérification des dépendances
  const dependencies = await query(`
    SELECT 
      (SELECT COUNT(*) FROM documents WHERE project_id = $1) as documents_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = $1) as tasks_count,
      (SELECT COUNT(*) FROM quotes WHERE project_id = $1) as quotes_count
  `, [id]);

  const deps = dependencies.rows[0];
  if (parseInt(deps.documents_count) > 0 || parseInt(deps.tasks_count) > 0 || parseInt(deps.quotes_count) > 0) {
    throw ErrorTypes.BAD_REQUEST('Impossible de supprimer un projet contenant des documents, tâches ou devis');
  }

  // Suppression du projet
  await query('DELETE FROM projects WHERE id = $1', [id]);

  logger.audit('Suppression projet', {
    projectId: id,
    projectName: existingProject.rows[0].name,
    deletedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Projet supprimé avec succès'
  });
}));

module.exports = router;

