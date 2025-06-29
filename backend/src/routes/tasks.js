/**
 * Routes de gestion des tâches
 * Auteur: Manus AI
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Liste des tâches
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, assigned_to, status } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (req.user.role === 'user' || req.user.role === 'preventionist') {
    whereConditions.push(`(t.assigned_to = $${paramIndex} OR p.assigned_user_id = $${paramIndex})`);
    queryParams.push(req.user.id);
    paramIndex++;
  }

  if (project_id) {
    whereConditions.push(`t.project_id = $${paramIndex}`);
    queryParams.push(project_id);
    paramIndex++;
  }

  if (assigned_to) {
    whereConditions.push(`t.assigned_to = $${paramIndex}`);
    queryParams.push(assigned_to);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`t.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await query(`
    SELECT t.*, 
           p.name as project_name,
           u1.first_name as assigned_to_first_name, u1.last_name as assigned_to_last_name,
           u2.first_name as created_by_first_name, u2.last_name as created_by_last_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.created_by = u2.id
    ${whereClause}
    ORDER BY t.created_at DESC
  `, queryParams);

  res.json({ tasks: result.rows });
}));

// Créer une tâche
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('project_id').isUUID(),
  body('assigned_to').optional().isUUID(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('due_date').optional().isISO8601()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { title, description, project_id, assigned_to, priority, due_date } = req.body;

  const result = await query(
    `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description, project_id, assigned_to || req.user.id, req.user.id, priority || 'MEDIUM', due_date]
  );

  res.status(201).json({
    message: 'Tâche créée avec succès',
    task: result.rows[0]
  });
}));

// Modifier une tâche
router.put('/:id', [
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'])
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updateFields = [];
  const queryParams = [];
  let paramIndex = 1;

  Object.keys(updates).forEach(field => {
    if (['title', 'description', 'status', 'priority', 'due_date', 'assigned_to'].includes(field)) {
      updateFields.push(`${field} = $${paramIndex}`);
      queryParams.push(updates[field]);
      paramIndex++;
    }
  });

  if (updates.status === 'DONE') {
    updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  queryParams.push(id);

  const result = await query(
    `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    queryParams
  );

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Tâche');
  }

  res.json({
    message: 'Tâche modifiée avec succès',
    task: result.rows[0]
  });
}));

module.exports = router;

