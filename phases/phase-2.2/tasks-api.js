// API ERP PrevHub - Phase 2.2 - Module Tâches avec workflow
// Backend Node.js avec Express et PostgreSQL

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3002;

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'prevhub',
    user: process.env.DB_USER || 'prevhub_user',
    password: process.env.DB_PASSWORD || 'prevhub_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'prevhub_tasks_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Configuration upload
const upload = multer({
    dest: process.env.UPLOAD_PATH || './uploads/tasks',
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'));
        }
    }
});

// Middlewares de sécurité
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limite à 200 requêtes par fenêtre par IP
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard.',
        retryAfter: '15 minutes'
    }
});
app.use('/api/', limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Schémas de validation Joi
const taskSchema = Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().allow(''),
    category: Joi.string().max(100),
    type: Joi.string().valid('task', 'milestone', 'epic', 'story').default('task'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical').default('medium'),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'testing', 'done', 'cancelled', 'blocked').default('todo'),
    start_date: Joi.date().allow(null),
    due_date: Joi.date().allow(null),
    estimated_hours: Joi.number().min(0).allow(null),
    completion_percentage: Joi.number().min(0).max(100).default(0),
    parent_task_id: Joi.number().integer().allow(null),
    epic_id: Joi.number().integer().allow(null),
    project_id: Joi.number().integer().allow(null),
    company_id: Joi.number().integer().allow(null),
    etablissement_id: Joi.number().integer().allow(null),
    assigned_to: Joi.number().integer().allow(null),
    workflow_id: Joi.number().integer().allow(null),
    tags: Joi.array().items(Joi.string()),
    labels: Joi.object(),
    custom_fields: Joi.object(),
    story_points: Joi.number().integer().min(0).allow(null),
    business_value: Joi.number().integer().min(1).max(100).allow(null),
    risk_level: Joi.string().valid('low', 'medium', 'high').default('low'),
    complexity: Joi.string().valid('simple', 'medium', 'complex').default('simple')
});

const commentSchema = Joi.object({
    content: Joi.string().min(1).required(),
    comment_type: Joi.string().valid('comment', 'status_change', 'assignment', 'time_log', 'attachment').default('comment'),
    is_internal: Joi.boolean().default(false),
    time_spent_minutes: Joi.number().integer().min(0).allow(null),
    parent_comment_id: Joi.number().integer().allow(null)
});

const assignmentSchema = Joi.object({
    user_id: Joi.number().integer().required(),
    role: Joi.string().valid('assignee', 'reviewer', 'observer', 'approver').default('assignee'),
    workload_percentage: Joi.number().integer().min(1).max(100).default(100)
});

// Fonctions utilitaires
const handleError = (res, error, message = 'Erreur serveur') => {
    console.error('Erreur:', error);
    res.status(500).json({ 
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

const validateSchema = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Données invalides', 
                details: error.details.map(d => d.message)
            });
        }
        next();
    };
};

// Routes de santé et informations
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'ERP PrevHub - API Tâches',
        version: '2.2.0',
        timestamp: new Date().toISOString()
    });
});

// Routes d'authentification (simplifiées pour la démo)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Authentification simplifiée pour la démo
        if (username === 'admin' && password === 'admin') {
            const token = jwt.sign(
                { id: 1, username: 'admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            
            res.json({
                success: true,
                token,
                user: { id: 1, username: 'admin', role: 'admin' }
            });
        } else {
            res.status(401).json({ error: 'Identifiants invalides' });
        }
    } catch (error) {
        handleError(res, error, 'Erreur d\'authentification');
    }
});

// Routes des tâches

// GET /api/tasks - Liste des tâches avec filtres et pagination
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            priority,
            assigned_to,
            project_id,
            company_id,
            search,
            sort_by = 'created_at',
            sort_order = 'DESC',
            include_archived = 'false'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Filtres
        if (include_archived === 'false') {
            whereConditions.push(`t.is_archived = false`);
        }

        if (status) {
            whereConditions.push(`t.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (priority) {
            whereConditions.push(`t.priority = $${paramIndex}`);
            queryParams.push(priority);
            paramIndex++;
        }

        if (assigned_to) {
            whereConditions.push(`(t.assigned_to = $${paramIndex} OR ta.user_id = $${paramIndex})`);
            queryParams.push(parseInt(assigned_to));
            paramIndex++;
        }

        if (project_id) {
            whereConditions.push(`t.project_id = $${paramIndex}`);
            queryParams.push(parseInt(project_id));
            paramIndex++;
        }

        if (company_id) {
            whereConditions.push(`t.company_id = $${paramIndex}`);
            queryParams.push(parseInt(company_id));
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`(
                to_tsvector('french', coalesce(t.title, '') || ' ' || coalesce(t.description, ''))
                @@ plainto_tsquery('french', $${paramIndex})
            )`);
            queryParams.push(search);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête principale
        const query = `
            SELECT DISTINCT
                t.*,
                p.name as project_name,
                c.name as company_name,
                e.name as etablissement_name,
                tw.name as workflow_name,
                ws.step_name as current_step_name,
                (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id AND tc.is_deleted = false) as comments_count,
                (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) as attachments_count,
                (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_task_id = t.id) as subtasks_count,
                (SELECT string_agg(ta2.user_id::text, ',') FROM task_assignments ta2 WHERE ta2.task_id = t.id AND ta2.status = 'accepted') as assignee_ids,
                CASE 
                    WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('done', 'cancelled') THEN 'overdue'
                    WHEN t.due_date = CURRENT_DATE AND t.status NOT IN ('done', 'cancelled') THEN 'due_today'
                    WHEN t.due_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '3 days' AND t.status NOT IN ('done', 'cancelled') THEN 'due_soon'
                    ELSE 'normal'
                END as urgency_status
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN companies c ON t.company_id = c.id
            LEFT JOIN etablissements e ON t.etablissement_id = e.id
            LEFT JOIN task_workflows tw ON t.workflow_id = tw.id
            LEFT JOIN workflow_steps ws ON tw.id = ws.workflow_id AND ws.step_number = t.current_workflow_step
            LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.status = 'accepted'
            ${whereClause}
            ORDER BY t.${sort_by} ${sort_order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(DISTINCT t.id) as total
            FROM tasks t
            LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.status = 'accepted'
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des tâches');
    }
});

// POST /api/tasks - Créer une nouvelle tâche
app.post('/api/tasks', authenticateToken, validateSchema(taskSchema), async (req, res) => {
    try {
        const taskData = req.body;
        taskData.created_by = req.user.id;

        const fields = Object.keys(taskData);
        const values = Object.values(taskData);
        const placeholders = values.map((_, index) => `$${index + 1}`);

        const query = `
            INSERT INTO tasks (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;

        const result = await pool.query(query, values);
        const task = result.rows[0];

        // Créer une assignation si assigned_to est spécifié
        if (taskData.assigned_to) {
            await pool.query(
                'INSERT INTO task_assignments (task_id, user_id, role, assigned_by, status) VALUES ($1, $2, $3, $4, $5)',
                [task.id, taskData.assigned_to, 'assignee', req.user.id, 'accepted']
            );
        }

        // Créer une notification
        if (taskData.assigned_to && taskData.assigned_to !== req.user.id) {
            await pool.query(`
                INSERT INTO task_notifications (task_id, user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                task.id,
                taskData.assigned_to,
                'assigned',
                'Nouvelle tâche assignée',
                `La tâche "${task.title}" vous a été assignée`
            ]);
        }

        res.status(201).json({
            success: true,
            data: task,
            message: 'Tâche créée avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la création de la tâche');
    }
});

// GET /api/tasks/:id - Détail d'une tâche
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        const query = `
            SELECT 
                t.*,
                p.name as project_name,
                c.name as company_name,
                e.name as etablissement_name,
                tw.name as workflow_name,
                ws.step_name as current_step_name,
                ws.step_type as current_step_type,
                (SELECT json_agg(json_build_object(
                    'id', ta.id,
                    'user_id', ta.user_id,
                    'role', ta.role,
                    'status', ta.status,
                    'workload_percentage', ta.workload_percentage,
                    'assigned_at', ta.assigned_at
                )) FROM task_assignments ta WHERE ta.task_id = t.id) as assignments,
                (SELECT json_agg(json_build_object(
                    'id', tc.id,
                    'content', tc.content,
                    'comment_type', tc.comment_type,
                    'created_by', tc.created_by,
                    'created_at', tc.created_at,
                    'time_spent_minutes', tc.time_spent_minutes,
                    'is_internal', tc.is_internal
                ) ORDER BY tc.created_at DESC) FROM task_comments tc WHERE tc.task_id = t.id AND tc.is_deleted = false) as comments,
                (SELECT json_agg(json_build_object(
                    'id', ta.id,
                    'file_name', ta.file_name,
                    'file_size', ta.file_size,
                    'mime_type', ta.mime_type,
                    'uploaded_by', ta.uploaded_by,
                    'uploaded_at', ta.uploaded_at
                )) FROM task_attachments ta WHERE ta.task_id = t.id) as attachments,
                (SELECT json_agg(json_build_object(
                    'id', sub.id,
                    'title', sub.title,
                    'status', sub.status,
                    'completion_percentage', sub.completion_percentage
                )) FROM tasks sub WHERE sub.parent_task_id = t.id) as subtasks,
                (SELECT json_agg(json_build_object(
                    'predecessor_id', td.predecessor_task_id,
                    'successor_id', td.successor_task_id,
                    'dependency_type', td.dependency_type,
                    'lag_days', td.lag_days
                )) FROM task_dependencies td WHERE td.predecessor_task_id = t.id OR td.successor_task_id = t.id) as dependencies
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN companies c ON t.company_id = c.id
            LEFT JOIN etablissements e ON t.etablissement_id = e.id
            LEFT JOIN task_workflows tw ON t.workflow_id = tw.id
            LEFT JOIN workflow_steps ws ON tw.id = ws.workflow_id AND ws.step_number = t.current_workflow_step
            WHERE t.id = $1
        `;

        const result = await pool.query(query, [taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération de la tâche');
    }
});

// PUT /api/tasks/:id - Mettre à jour une tâche
app.put('/api/tasks/:id', authenticateToken, validateSchema(taskSchema.fork(['title'], (schema) => schema.optional())), async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const updateData = req.body;

        // Vérifier que la tâche existe
        const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        const oldTask = existingTask.rows[0];

        // Construire la requête de mise à jour
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

        const query = `
            UPDATE tasks 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${fields.length + 1}
            RETURNING *
        `;

        const result = await pool.query(query, [...values, taskId]);
        const updatedTask = result.rows[0];

        // Créer un commentaire de changement de statut si nécessaire
        if (updateData.status && updateData.status !== oldTask.status) {
            await pool.query(`
                INSERT INTO task_comments (task_id, content, comment_type, created_by, is_system, system_data)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                taskId,
                `Statut changé de "${oldTask.status}" vers "${updateData.status}"`,
                'status_change',
                req.user.id,
                true,
                JSON.stringify({ old_status: oldTask.status, new_status: updateData.status })
            ]);
        }

        // Mettre à jour la date de completion si la tâche est terminée
        if (updateData.status === 'done' && oldTask.status !== 'done') {
            await pool.query('UPDATE tasks SET completed_at = NOW() WHERE id = $1', [taskId]);
        }

        res.json({
            success: true,
            data: updatedTask,
            message: 'Tâche mise à jour avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la mise à jour de la tâche');
    }
});

// DELETE /api/tasks/:id - Supprimer une tâche
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        // Vérifier que la tâche existe
        const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tâche non trouvée' });
        }

        // Archiver plutôt que supprimer
        await pool.query(`
            UPDATE tasks 
            SET is_archived = true, archived_at = NOW(), archived_by = $1
            WHERE id = $2
        `, [req.user.id, taskId]);

        res.json({
            success: true,
            message: 'Tâche archivée avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la suppression de la tâche');
    }
});

// Routes des commentaires

// GET /api/tasks/:id/comments - Commentaires d'une tâche
app.get('/api/tasks/:id/comments', authenticateToken, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        const query = `
            SELECT 
                tc.*,
                CASE 
                    WHEN tc.parent_comment_id IS NOT NULL THEN
                        (SELECT json_build_object(
                            'id', parent.id,
                            'content', parent.content,
                            'created_by', parent.created_by
                        ) FROM task_comments parent WHERE parent.id = tc.parent_comment_id)
                    ELSE NULL
                END as parent_comment
            FROM task_comments tc
            WHERE tc.task_id = $1 AND tc.is_deleted = false
            ORDER BY tc.created_at ASC
        `;

        const result = await pool.query(query, [taskId]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des commentaires');
    }
});

// POST /api/tasks/:id/comments - Ajouter un commentaire
app.post('/api/tasks/:id/comments', authenticateToken, validateSchema(commentSchema), async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const commentData = { ...req.body, task_id: taskId, created_by: req.user.id };

        const fields = Object.keys(commentData);
        const values = Object.values(commentData);
        const placeholders = values.map((_, index) => `$${index + 1}`);

        const query = `
            INSERT INTO task_comments (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;

        const result = await pool.query(query, values);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Commentaire ajouté avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de l\'ajout du commentaire');
    }
});

// Routes des assignations

// POST /api/tasks/:id/assignments - Assigner une tâche
app.post('/api/tasks/:id/assignments', authenticateToken, validateSchema(assignmentSchema), async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const assignmentData = { 
            ...req.body, 
            task_id: taskId, 
            assigned_by: req.user.id,
            status: 'pending'
        };

        const query = `
            INSERT INTO task_assignments (task_id, user_id, role, assigned_by, status, workload_percentage)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (task_id, user_id, role) 
            DO UPDATE SET 
                assigned_by = EXCLUDED.assigned_by,
                assigned_at = NOW(),
                status = EXCLUDED.status,
                workload_percentage = EXCLUDED.workload_percentage
            RETURNING *
        `;

        const result = await pool.query(query, [
            taskId,
            assignmentData.user_id,
            assignmentData.role,
            assignmentData.assigned_by,
            assignmentData.status,
            assignmentData.workload_percentage
        ]);

        // Créer une notification
        if (assignmentData.user_id !== req.user.id) {
            const taskResult = await pool.query('SELECT title FROM tasks WHERE id = $1', [taskId]);
            const taskTitle = taskResult.rows[0]?.title || 'Tâche';

            await pool.query(`
                INSERT INTO task_notifications (task_id, user_id, notification_type, title, message)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                taskId,
                assignmentData.user_id,
                'assigned',
                'Nouvelle assignation',
                `Vous avez été assigné à la tâche "${taskTitle}" avec le rôle ${assignmentData.role}`
            ]);
        }

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Assignation créée avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de l\'assignation');
    }
});

// Routes des workflows

// GET /api/workflows - Liste des workflows
app.get('/api/workflows', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                tw.*,
                (SELECT json_agg(json_build_object(
                    'step_number', ws.step_number,
                    'step_name', ws.step_name,
                    'step_type', ws.step_type,
                    'sla_hours', ws.sla_hours
                ) ORDER BY ws.step_number) FROM workflow_steps ws WHERE ws.workflow_id = tw.id) as steps
            FROM task_workflows tw
            WHERE tw.is_active = true
            ORDER BY tw.name
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des workflows');
    }
});

// Routes des templates

// GET /api/task-templates - Liste des templates
app.get('/api/task-templates', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                tt.*,
                tw.name as workflow_name
            FROM task_templates tt
            LEFT JOIN task_workflows tw ON tt.default_workflow_id = tw.id
            WHERE tt.is_active = true
            ORDER BY tt.name
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des templates');
    }
});

// Routes de recherche

// GET /api/tasks/search - Recherche de tâches
app.get('/api/tasks/search', authenticateToken, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await pool.query(
            'SELECT * FROM search_tasks($1, $2, NULL, NULL, $3, 0)',
            [q.trim(), req.user.id, parseInt(limit)]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la recherche');
    }
});

// Routes des statistiques

// GET /api/tasks/stats - Statistiques des tâches
app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.query;
        const userId = user_id ? parseInt(user_id) : null;

        const result = await pool.query('SELECT * FROM get_task_stats($1)', [userId]);
        const stats = result.rows[0];

        // Statistiques additionnelles
        const additionalStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM tasks WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND is_archived = false) as tasks_created_this_week,
                (SELECT COUNT(*) FROM tasks WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days') as tasks_completed_this_week,
                (SELECT COUNT(*) FROM task_comments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as comments_this_week,
                (SELECT COUNT(DISTINCT user_id) FROM task_assignments WHERE assigned_at >= CURRENT_DATE - INTERVAL '7 days') as active_users_this_week
        `);

        res.json({
            success: true,
            data: {
                ...stats,
                ...additionalStats.rows[0]
            }
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des statistiques');
    }
});

// Routes des notifications

// GET /api/notifications - Notifications de l'utilisateur
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, unread_only = 'false' } = req.query;

        let whereClause = 'WHERE tn.user_id = $1';
        if (unread_only === 'true') {
            whereClause += ' AND tn.is_read = false';
        }

        const query = `
            SELECT 
                tn.*,
                t.title as task_title
            FROM task_notifications tn
            LEFT JOIN tasks t ON tn.task_id = t.id
            ${whereClause}
            ORDER BY tn.created_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [req.user.id, parseInt(limit)]);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des notifications');
    }
});

// PUT /api/notifications/:id/read - Marquer une notification comme lue
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        await pool.query(`
            UPDATE task_notifications 
            SET is_read = true, read_at = NOW()
            WHERE id = $1 AND user_id = $2
        `, [notificationId, req.user.id]);

        res.json({
            success: true,
            message: 'Notification marquée comme lue'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la mise à jour de la notification');
    }
});

// Routes des pièces jointes

// POST /api/tasks/:id/attachments - Upload d'une pièce jointe
app.post('/api/tasks/:id/attachments', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const file = req.file;
        const { description } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const query = `
            INSERT INTO task_attachments (task_id, file_name, file_path, file_size, mime_type, description, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            taskId,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            description || null,
            req.user.id
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Fichier uploadé avec succès'
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de l\'upload du fichier');
    }
});

// Routes des sprints (Agile)

// GET /api/sprints - Liste des sprints
app.get('/api/sprints', authenticateToken, async (req, res) => {
    try {
        const { status, project_id } = req.query;

        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`s.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (project_id) {
            whereConditions.push(`s.project_id = $${paramIndex}`);
            queryParams.push(parseInt(project_id));
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                s.*,
                p.name as project_name,
                (SELECT COUNT(*) FROM sprint_tasks st WHERE st.sprint_id = s.id) as tasks_count,
                (SELECT SUM(st.planned_story_points) FROM sprint_tasks st WHERE st.sprint_id = s.id) as total_story_points,
                (SELECT SUM(st.planned_hours) FROM sprint_tasks st WHERE st.sprint_id = s.id) as total_planned_hours
            FROM sprints s
            LEFT JOIN projects p ON s.project_id = p.id
            ${whereClause}
            ORDER BY s.start_date DESC
        `;

        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        handleError(res, error, 'Erreur lors de la récupération des sprints');
    }
});

// Middleware de gestion des erreurs
app.use((error, req, res, next) => {
    console.error('Erreur non gérée:', error);
    res.status(500).json({
        error: 'Erreur serveur interne',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.originalUrl
    });
});

// Démarrage du serveur
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Tâches ERP PrevHub démarrée sur le port ${PORT}`);
    console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        pool.end();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        pool.end();
        process.exit(0);
    });
});

module.exports = app;

