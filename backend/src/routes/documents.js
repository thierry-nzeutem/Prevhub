/**
 * Routes de gestion des documents
 * Auteur: Manus AI
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Liste des documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [NOTICE, PLAN, RAPPORT, DEVIS, FACTURE]
 *     responses:
 *       200:
 *         description: Liste des documents
 */
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, type } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Filtrage par rôle utilisateur
  if (req.user.role === 'user' || req.user.role === 'preventionist') {
    whereConditions.push(`p.assigned_user_id = $${paramIndex}`);
    queryParams.push(req.user.id);
    paramIndex++;
  }

  if (project_id) {
    whereConditions.push(`d.project_id = $${paramIndex}`);
    queryParams.push(project_id);
    paramIndex++;
  }

  if (type) {
    whereConditions.push(`d.type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await query(`
    SELECT d.*, 
           p.name as project_name,
           u.first_name as uploaded_by_first_name,
           u.last_name as uploaded_by_last_name
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    ${whereClause}
    ORDER BY d.created_at DESC
  `, queryParams);

  res.json({ documents: result.rows });
}));

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload de documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               project_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [NOTICE, PLAN, RAPPORT, DEVIS, FACTURE]
 *     responses:
 *       201:
 *         description: Documents uploadés avec succès
 */
router.post('/upload', [
  upload.array('files', 10),
  body('project_id').isUUID().withMessage('ID de projet valide requis'),
  body('type').optional().isIn(['NOTICE', 'PLAN', 'RAPPORT', 'DEVIS', 'FACTURE'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { project_id, type } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    throw ErrorTypes.BAD_REQUEST('Aucun fichier fourni');
  }

  // Vérification que le projet existe et que l'utilisateur y a accès
  const projectResult = await query(
    'SELECT id, assigned_user_id FROM projects WHERE id = $1',
    [project_id]
  );

  if (projectResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Projet');
  }

  const project = projectResult.rows[0];
  if ((req.user.role === 'user' || req.user.role === 'preventionist') && 
      project.assigned_user_id !== req.user.id) {
    throw ErrorTypes.FORBIDDEN('Accès non autorisé à ce projet');
  }

  const uploadedDocuments = [];

  for (const file of files) {
    const documentResult = await query(
      `INSERT INTO documents (project_id, uploaded_by, name, original_name, file_path, 
                             file_size, mime_type, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        project_id,
        req.user.id,
        file.filename,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        type || 'DOCUMENT'
      ]
    );

    uploadedDocuments.push(documentResult.rows[0]);
  }

  logger.audit('Upload documents', {
    projectId: project_id,
    documentsCount: files.length,
    uploadedBy: req.user.id,
    ip: req.ip
  });

  res.status(201).json({
    message: 'Documents uploadés avec succès',
    documents: uploadedDocuments
  });
}));

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Télécharger un document
 *     tags: [Documents]
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
 *         description: Fichier téléchargé
 *       404:
 *         description: Document non trouvé
 */
router.get('/:id/download', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(`
    SELECT d.*, p.assigned_user_id
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    WHERE d.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Document');
  }

  const document = result.rows[0];

  // Vérification des permissions
  if ((req.user.role === 'user' || req.user.role === 'preventionist') && 
      document.assigned_user_id !== req.user.id) {
    throw ErrorTypes.FORBIDDEN('Accès non autorisé à ce document');
  }

  try {
    await fs.access(document.file_path);
    res.download(document.file_path, document.original_name);
  } catch (error) {
    throw ErrorTypes.NOT_FOUND('Fichier non trouvé sur le serveur');
  }
}));

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Supprimer un document
 *     tags: [Documents]
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
 *         description: Document supprimé avec succès
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(`
    SELECT d.*, p.assigned_user_id
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    WHERE d.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Document');
  }

  const document = result.rows[0];

  // Vérification des permissions
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
      document.uploaded_by !== req.user.id) {
    throw ErrorTypes.FORBIDDEN('Seul l\'auteur du document peut le supprimer');
  }

  // Suppression du fichier physique
  try {
    await fs.unlink(document.file_path);
  } catch (error) {
    logger.warn('Impossible de supprimer le fichier physique:', error);
  }

  // Suppression de l'enregistrement
  await query('DELETE FROM documents WHERE id = $1', [id]);

  logger.audit('Suppression document', {
    documentId: id,
    documentName: document.original_name,
    deletedBy: req.user.id,
    ip: req.ip
  });

  res.json({
    message: 'Document supprimé avec succès'
  });
}));

module.exports = router;

