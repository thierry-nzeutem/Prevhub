/**
 * Routes de gestion des organisations (clients)
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
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         siret:
 *           type: string
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         postal_code:
 *           type: string
 *         country:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         website:
 *           type: string
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     Contact:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         position:
 *           type: string
 *         is_primary:
 *           type: boolean
 */

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Liste des organisations
 *     tags: [Organisations]
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
 *         description: Recherche par nom, SIRET ou ville
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif
 *     responses:
 *       200:
 *         description: Liste des organisations
 */
router.get('/', [
  requireRole(['admin', 'manager', 'commercial']),
  queryValidator('page').optional().isInt({ min: 1 }).toInt(),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  queryValidator('search').optional().trim().escape(),
  queryValidator('active').optional().isBoolean().toBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Paramètres invalides', errors.array());
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;
  const { search, active } = req.query;

  // Construction de la requête avec filtres
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR siret ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (active !== undefined) {
    whereConditions.push(`is_active = $${paramIndex}`);
    queryParams.push(active);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Requête pour le total
  const countQuery = `SELECT COUNT(*) FROM organizations ${whereClause}`;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  // Requête pour les données avec contacts principaux
  const dataQuery = `
    SELECT o.*, 
           c.first_name as primary_contact_first_name,
           c.last_name as primary_contact_last_name,
           c.email as primary_contact_email,
           c.phone as primary_contact_phone,
           (SELECT COUNT(*) FROM projects WHERE organization_id = o.id) as projects_count
    FROM organizations o
    LEFT JOIN contacts c ON o.id = c.organization_id AND c.is_primary = true
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const result = await query(dataQuery, queryParams);

  res.json({
    organizations: result.rows,
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
 * /api/organizations/{id}:
 *   get:
 *     summary: Détails d'une organisation
 *     tags: [Organisations]
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
 *         description: Détails de l'organisation avec contacts
 *       404:
 *         description: Organisation non trouvée
 */
router.get('/:id', requireRole(['admin', 'manager', 'commercial', 'user']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Récupération de l'organisation
  const orgResult = await query(
    'SELECT * FROM organizations WHERE id = $1',
    [id]
  );

  if (orgResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Organisation');
  }

  // Récupération des contacts
  const contactsResult = await query(
    'SELECT * FROM contacts WHERE organization_id = $1 ORDER BY is_primary DESC, last_name ASC',
    [id]
  );

  // Récupération des statistiques
  const statsResult = await query(`
    SELECT 
      COUNT(p.id) as projects_count,
      COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END) as completed_projects,
      COUNT(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 END) as active_projects,
      COALESCE(SUM(q.total_amount), 0) as total_quotes_amount,
      COUNT(q.id) as quotes_count
    FROM projects p
    LEFT JOIN quotes q ON p.id = q.project_id
    WHERE p.organization_id = $1
  `, [id]);

  const organization = orgResult.rows[0];
  organization.contacts = contactsResult.rows;
  organization.stats = statsResult.rows[0];

  res.json(organization);
}));

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Créer une nouvelle organisation
 *     tags: [Organisations]
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
 *             properties:
 *               name:
 *                 type: string
 *               siret:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               country:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               website:
 *                 type: string
 *               primary_contact:
 *                 type: object
 *                 properties:
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   position:
 *                     type: string
 *     responses:
 *       201:
 *         description: Organisation créée avec succès
 */
router.post('/', [
  requireRole(['admin', 'manager', 'commercial']),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom de l\'organisation requis (1-255 caractères)'),
  body('siret')
    .optional()
    .isLength({ min: 14, max: 14 })
    .isNumeric()
    .withMessage('SIRET doit contenir exactement 14 chiffres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('website')
    .optional()
    .isURL()
    .withMessage('URL de site web valide requise'),
  body('postal_code')
    .optional()
    .matches(/^[0-9]{5}$/)
    .withMessage('Code postal français valide requis (5 chiffres)'),
  body('primary_contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email du contact principal invalide')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { primary_contact, ...orgData } = req.body;

  // Vérification de l'unicité du SIRET si fourni
  if (orgData.siret) {
    const existingSiret = await query('SELECT id FROM organizations WHERE siret = $1', [orgData.siret]);
    if (existingSiret.rows.length > 0) {
      throw ErrorTypes.CONFLICT('Ce numéro SIRET est déjà utilisé');
    }
  }

  const result = await transaction(async (client) => {
    // Création de l'organisation
    const orgResult = await client.query(
      `INSERT INTO organizations (name, siret, address, city, postal_code, country, phone, email, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orgData.name,
        orgData.siret || null,
        orgData.address || null,
        orgData.city || null,
        orgData.postal_code || null,
        orgData.country || 'France',
        orgData.phone || null,
        orgData.email || null,
        orgData.website || null
      ]
    );

    const organization = orgResult.rows[0];

    // Création du contact principal si fourni
    if (primary_contact && primary_contact.first_name && primary_contact.last_name) {
      const contactResult = await client.query(
        `INSERT INTO contacts (organization_id, first_name, last_name, email, phone, position, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [
          organization.id,
          primary_contact.first_name,
          primary_contact.last_name,
          primary_contact.email || null,
          primary_contact.phone || null,
          primary_contact.position || null
        ]
      );

      organization.primary_contact = contactResult.rows[0];
    }

    return organization;
  });

  logger.audit('Création organisation', {
    organizationId: result.id,
    organizationName: result.name,
    createdBy: req.user.id,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Organisation créée avec succès',
    organization: result
  });
}));

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Modifier une organisation
 *     tags: [Organisations]
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
 *         description: Organisation modifiée avec succès
 */
router.put('/:id', [
  requireRole(['admin', 'manager', 'commercial']),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom de l\'organisation requis (1-255 caractères)'),
  body('siret')
    .optional()
    .isLength({ min: 14, max: 14 })
    .isNumeric()
    .withMessage('SIRET doit contenir exactement 14 chiffres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('website')
    .optional()
    .isURL()
    .withMessage('URL de site web valide requise'),
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

  // Vérification que l'organisation existe
  const existingOrg = await query('SELECT * FROM organizations WHERE id = $1', [id]);
  if (existingOrg.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Organisation');
  }

  // Vérification de l'unicité du SIRET si modifié
  if (updates.siret && updates.siret !== existingOrg.rows[0].siret) {
    const siretCheck = await query('SELECT id FROM organizations WHERE siret = $1 AND id != $2', [updates.siret, id]);
    if (siretCheck.rows.length > 0) {
      throw ErrorTypes.CONFLICT('Ce numéro SIRET est déjà utilisé');
    }
  }

  // Construction de la requête de mise à jour
  const updateFields = [];
  const queryParams = [];
  let paramIndex = 1;

  const allowedFields = ['name', 'siret', 'address', 'city', 'postal_code', 'country', 'phone', 'email', 'website', 'is_active'];
  
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
    UPDATE organizations 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(updateQuery, queryParams);

  logger.audit('Modification organisation', {
    organizationId: id,
    modifiedFields: Object.keys(updates),
    modifiedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Organisation modifiée avec succès',
    organization: result.rows[0]
  });
}));

/**
 * @swagger
 * /api/organizations/{id}/contacts:
 *   post:
 *     summary: Ajouter un contact à une organisation
 *     tags: [Organisations]
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
 *               - first_name
 *               - last_name
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               position:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Contact ajouté avec succès
 */
router.post('/:id/contacts', [
  requireRole(['admin', 'manager', 'commercial']),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Prénom requis (1-100 caractères)'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom requis (1-100 caractères)'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('Contact principal doit être un booléen')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { id } = req.params;
  const { first_name, last_name, email, phone, position, is_primary } = req.body;

  // Vérification que l'organisation existe
  const orgExists = await query('SELECT id FROM organizations WHERE id = $1', [id]);
  if (orgExists.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Organisation');
  }

  const result = await transaction(async (client) => {
    // Si ce contact devient principal, retirer le statut des autres
    if (is_primary) {
      await client.query(
        'UPDATE contacts SET is_primary = false WHERE organization_id = $1',
        [id]
      );
    }

    // Création du contact
    const contactResult = await client.query(
      `INSERT INTO contacts (organization_id, first_name, last_name, email, phone, position, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, first_name, last_name, email || null, phone || null, position || null, is_primary || false]
    );

    return contactResult.rows[0];
  });

  logger.audit('Ajout contact organisation', {
    organizationId: id,
    contactId: result.id,
    contactName: `${first_name} ${last_name}`,
    createdBy: req.user.id,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Contact ajouté avec succès',
    contact: result
  });
}));

/**
 * @swagger
 * /api/organizations/{id}/contacts/{contactId}:
 *   put:
 *     summary: Modifier un contact
 *     tags: [Organisations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact modifié avec succès
 */
router.put('/:id/contacts/:contactId', [
  requireRole(['admin', 'manager', 'commercial']),
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
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email valide requise'),
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('Contact principal doit être un booléen')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { id, contactId } = req.params;
  const updates = req.body;

  // Vérification que le contact existe et appartient à l'organisation
  const existingContact = await query(
    'SELECT * FROM contacts WHERE id = $1 AND organization_id = $2',
    [contactId, id]
  );
  
  if (existingContact.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Contact');
  }

  const result = await transaction(async (client) => {
    // Si ce contact devient principal, retirer le statut des autres
    if (updates.is_primary) {
      await client.query(
        'UPDATE contacts SET is_primary = false WHERE organization_id = $1 AND id != $2',
        [id, contactId]
      );
    }

    // Construction de la requête de mise à jour
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'position', 'is_primary'];
    
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
    queryParams.push(contactId);

    const updateQuery = `
      UPDATE contacts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const contactResult = await client.query(updateQuery, queryParams);
    return contactResult.rows[0];
  });

  logger.audit('Modification contact organisation', {
    organizationId: id,
    contactId,
    modifiedFields: Object.keys(updates),
    modifiedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Contact modifié avec succès',
    contact: result
  });
}));

/**
 * @swagger
 * /api/organizations/{id}/contacts/{contactId}:
 *   delete:
 *     summary: Supprimer un contact
 *     tags: [Organisations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact supprimé avec succès
 */
router.delete('/:id/contacts/:contactId', requireRole(['admin', 'manager', 'commercial']), asyncHandler(async (req, res) => {
  const { id, contactId } = req.params;

  // Vérification que le contact existe et appartient à l'organisation
  const existingContact = await query(
    'SELECT first_name, last_name FROM contacts WHERE id = $1 AND organization_id = $2',
    [contactId, id]
  );
  
  if (existingContact.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Contact');
  }

  // Suppression du contact
  await query('DELETE FROM contacts WHERE id = $1', [contactId]);

  logger.audit('Suppression contact organisation', {
    organizationId: id,
    contactId,
    contactName: `${existingContact.rows[0].first_name} ${existingContact.rows[0].last_name}`,
    deletedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Contact supprimé avec succès'
  });
}));

module.exports = router;

