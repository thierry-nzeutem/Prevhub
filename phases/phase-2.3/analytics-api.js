// API ERP PrevHub - Phase 2.3 - Module Rapports et Analytics
// Système complet de Business Intelligence et métriques de performance

const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

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
    max: 200, // Plus élevé pour les analytics
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/', limiter);

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'prevhub_analytics_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Fonction utilitaire pour les requêtes
const executeQuery = async (query, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Erreur de requête:', error);
        throw error;
    } finally {
        client.release();
    }
};

// ==================== ENDPOINTS ANALYTICS ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'PrevHub Analytics API',
        version: '2.3.0',
        timestamp: new Date().toISOString()
    });
});

// Dashboard principal - Métriques globales
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', compare = false } = req.query;
        
        // Calculer les dates
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        // Métriques principales
        const metricsQuery = `
            WITH period_data AS (
                SELECT 
                    -- Projets
                    COUNT(DISTINCT p.id) as total_projects,
                    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
                    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
                    
                    -- Tâches
                    COUNT(DISTINCT t.id) as total_tasks,
                    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
                    COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN t.id END) as overdue_tasks,
                    
                    -- Clients
                    COUNT(DISTINCT c.id) as total_companies,
                    COUNT(DISTINCT e.id) as total_etablissements,
                    
                    -- Documents
                    COUNT(DISTINCT d.id) as total_documents,
                    SUM(CASE WHEN d.created_at >= $1 THEN 1 ELSE 0 END) as new_documents,
                    
                    -- Revenus (estimés)
                    SUM(CASE WHEN p.budget > 0 THEN p.budget ELSE 0 END) as total_budget,
                    SUM(CASE WHEN p.status = 'completed' AND p.budget > 0 THEN p.budget ELSE 0 END) as completed_budget
                    
                FROM projects p
                LEFT JOIN tasks t ON t.project_id = p.id
                LEFT JOIN companies c ON c.id = p.company_id
                LEFT JOIN etablissements e ON e.company_id = c.id
                LEFT JOIN documents d ON d.project_id = p.id
                WHERE p.created_at >= $1
            )
            SELECT * FROM period_data;
        `;

        const metrics = await executeQuery(metricsQuery, [startDate]);
        
        // Évolution temporelle
        const evolutionQuery = `
            SELECT 
                DATE_TRUNC('day', created_at) as date,
                COUNT(DISTINCT CASE WHEN table_name = 'projects' THEN id END) as projects,
                COUNT(DISTINCT CASE WHEN table_name = 'tasks' THEN id END) as tasks,
                COUNT(DISTINCT CASE WHEN table_name = 'documents' THEN id END) as documents
            FROM (
                SELECT id, created_at, 'projects' as table_name FROM projects WHERE created_at >= $1
                UNION ALL
                SELECT id, created_at, 'tasks' as table_name FROM tasks WHERE created_at >= $1
                UNION ALL
                SELECT id, created_at, 'documents' as table_name FROM documents WHERE created_at >= $1
            ) combined
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date;
        `;

        const evolution = await executeQuery(evolutionQuery, [startDate]);

        // Top performers
        const performersQuery = `
            SELECT 
                u.name,
                COUNT(DISTINCT t.id) as tasks_completed,
                AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600) as avg_completion_hours,
                COUNT(DISTINCT t.project_id) as projects_involved
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            JOIN users u ON u.id = ta.user_id
            WHERE t.status = 'done' 
            AND t.completed_at >= $1
            AND ta.role = 'assignee'
            GROUP BY u.id, u.name
            ORDER BY tasks_completed DESC
            LIMIT 10;
        `;

        const performers = await executeQuery(performersQuery, [startDate]);

        res.json({
            success: true,
            data: {
                period,
                startDate,
                endDate,
                metrics: metrics[0] || {},
                evolution,
                topPerformers: performers,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur dashboard:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la génération du dashboard' 
        });
    }
});

// Analytics des projets
app.get('/api/analytics/projects', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', status, company_id } = req.query;
        
        let whereClause = 'WHERE p.created_at >= $1';
        let params = [new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000)];
        
        if (status) {
            whereClause += ` AND p.status = $${params.length + 1}`;
            params.push(status);
        }
        
        if (company_id) {
            whereClause += ` AND p.company_id = $${params.length + 1}`;
            params.push(company_id);
        }

        // Statistiques des projets
        const statsQuery = `
            SELECT 
                p.status,
                COUNT(*) as count,
                AVG(p.budget) as avg_budget,
                SUM(p.budget) as total_budget,
                AVG(EXTRACT(EPOCH FROM (COALESCE(p.end_date, NOW()) - p.start_date))/86400) as avg_duration_days,
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
            FROM projects p
            LEFT JOIN tasks t ON t.project_id = p.id
            ${whereClause}
            GROUP BY p.status
            ORDER BY count DESC;
        `;

        const stats = await executeQuery(statsQuery, params);

        // Projets par secteur/industrie
        const sectorsQuery = `
            SELECT 
                c.sector,
                COUNT(DISTINCT p.id) as project_count,
                SUM(p.budget) as total_budget,
                AVG(p.budget) as avg_budget
            FROM projects p
            JOIN companies c ON c.id = p.company_id
            ${whereClause}
            GROUP BY c.sector
            ORDER BY project_count DESC;
        `;

        const sectors = await executeQuery(sectorsQuery, params);

        // Timeline des projets
        const timelineQuery = `
            SELECT 
                DATE_TRUNC('week', p.created_at) as week,
                COUNT(*) as new_projects,
                COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
                SUM(p.budget) as total_budget
            FROM projects p
            ${whereClause}
            GROUP BY DATE_TRUNC('week', p.created_at)
            ORDER BY week;
        `;

        const timeline = await executeQuery(timelineQuery, params);

        res.json({
            success: true,
            data: {
                stats,
                sectors,
                timeline,
                period,
                filters: { status, company_id }
            }
        });

    } catch (error) {
        console.error('Erreur analytics projets:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'analyse des projets' 
        });
    }
});

// Analytics des tâches
app.get('/api/analytics/tasks', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', user_id, project_id, priority } = req.query;
        
        let whereClause = 'WHERE t.created_at >= $1';
        let params = [new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000)];
        
        if (user_id) {
            whereClause += ` AND ta.user_id = $${params.length + 1}`;
            params.push(user_id);
        }
        
        if (project_id) {
            whereClause += ` AND t.project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        if (priority) {
            whereClause += ` AND t.priority = $${params.length + 1}`;
            params.push(priority);
        }

        // Métriques des tâches
        const metricsQuery = `
            SELECT 
                t.status,
                t.priority,
                COUNT(*) as count,
                AVG(t.estimated_hours) as avg_estimated_hours,
                AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600) as avg_completion_hours,
                COUNT(CASE WHEN t.due_date < t.completed_at THEN 1 END) as overdue_count,
                AVG(t.completion_percentage) as avg_completion
            FROM tasks t
            LEFT JOIN task_assignments ta ON ta.task_id = t.id
            ${whereClause}
            GROUP BY t.status, t.priority
            ORDER BY count DESC;
        `;

        const metrics = await executeQuery(metricsQuery, params);

        // Productivité par utilisateur
        const productivityQuery = `
            SELECT 
                u.name,
                COUNT(DISTINCT t.id) as tasks_assigned,
                COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as tasks_completed,
                AVG(t.completion_percentage) as avg_completion,
                SUM(tc.time_spent_minutes) as total_time_minutes
            FROM users u
            JOIN task_assignments ta ON ta.user_id = u.id
            JOIN tasks t ON t.id = ta.task_id
            LEFT JOIN task_comments tc ON tc.task_id = t.id AND tc.created_by = u.id
            ${whereClause.replace('t.created_at', 'ta.created_at')}
            GROUP BY u.id, u.name
            ORDER BY tasks_completed DESC
            LIMIT 20;
        `;

        const productivity = await executeQuery(productivityQuery, params);

        // Burndown chart (pour les sprints actifs)
        const burndownQuery = `
            SELECT 
                DATE_TRUNC('day', t.updated_at) as date,
                COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
                COUNT(*) as total_tasks,
                SUM(t.estimated_hours) as total_estimated_hours,
                SUM(CASE WHEN t.status = 'done' THEN t.estimated_hours ELSE 0 END) as completed_hours
            FROM tasks t
            ${whereClause}
            GROUP BY DATE_TRUNC('day', t.updated_at)
            ORDER BY date;
        `;

        const burndown = await executeQuery(burndownQuery, params);

        res.json({
            success: true,
            data: {
                metrics,
                productivity,
                burndown,
                period,
                filters: { user_id, project_id, priority }
            }
        });

    } catch (error) {
        console.error('Erreur analytics tâches:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'analyse des tâches' 
        });
    }
});

// Analytics des clients
app.get('/api/analytics/clients', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', sector, size } = req.query;
        
        let whereClause = 'WHERE c.created_at >= $1';
        let params = [new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000)];
        
        if (sector) {
            whereClause += ` AND c.sector = $${params.length + 1}`;
            params.push(sector);
        }
        
        if (size) {
            whereClause += ` AND c.size = $${params.length + 1}`;
            params.push(size);
        }

        // Répartition par secteur
        const sectorsQuery = `
            SELECT 
                c.sector,
                COUNT(DISTINCT c.id) as company_count,
                COUNT(DISTINCT e.id) as etablissement_count,
                COUNT(DISTINCT p.id) as project_count,
                SUM(p.budget) as total_revenue
            FROM companies c
            LEFT JOIN etablissements e ON e.company_id = c.id
            LEFT JOIN projects p ON p.company_id = c.id
            ${whereClause}
            GROUP BY c.sector
            ORDER BY company_count DESC;
        `;

        const sectors = await executeQuery(sectorsQuery, params);

        // Répartition par taille
        const sizesQuery = `
            SELECT 
                c.size,
                COUNT(DISTINCT c.id) as company_count,
                AVG(c.employee_count) as avg_employees,
                COUNT(DISTINCT p.id) as project_count,
                AVG(p.budget) as avg_project_budget
            FROM companies c
            LEFT JOIN projects p ON p.company_id = c.id
            ${whereClause}
            GROUP BY c.size
            ORDER BY company_count DESC;
        `;

        const sizes = await executeQuery(sizesQuery, params);

        // Top clients par revenus
        const topClientsQuery = `
            SELECT 
                c.name,
                c.sector,
                c.size,
                COUNT(DISTINCT p.id) as project_count,
                SUM(p.budget) as total_revenue,
                COUNT(DISTINCT t.id) as task_count,
                MAX(p.created_at) as last_project_date
            FROM companies c
            LEFT JOIN projects p ON p.company_id = c.id
            LEFT JOIN tasks t ON t.project_id = p.id
            ${whereClause}
            GROUP BY c.id, c.name, c.sector, c.size
            ORDER BY total_revenue DESC NULLS LAST
            LIMIT 20;
        `;

        const topClients = await executeQuery(topClientsQuery, params);

        // Évolution géographique
        const geoQuery = `
            SELECT 
                c.city,
                c.region,
                COUNT(DISTINCT c.id) as company_count,
                COUNT(DISTINCT e.id) as etablissement_count,
                SUM(p.budget) as total_revenue
            FROM companies c
            LEFT JOIN etablissements e ON e.company_id = c.id
            LEFT JOIN projects p ON p.company_id = c.id
            ${whereClause}
            GROUP BY c.city, c.region
            ORDER BY company_count DESC
            LIMIT 50;
        `;

        const geography = await executeQuery(geoQuery, params);

        res.json({
            success: true,
            data: {
                sectors,
                sizes,
                topClients,
                geography,
                period,
                filters: { sector, size }
            }
        });

    } catch (error) {
        console.error('Erreur analytics clients:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'analyse des clients' 
        });
    }
});

// Analytics des documents
app.get('/api/analytics/documents', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', category, project_id } = req.query;
        
        let whereClause = 'WHERE d.created_at >= $1';
        let params = [new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000)];
        
        if (category) {
            whereClause += ` AND d.category = $${params.length + 1}`;
            params.push(category);
        }
        
        if (project_id) {
            whereClause += ` AND d.project_id = $${params.length + 1}`;
            params.push(project_id);
        }

        // Statistiques des documents
        const statsQuery = `
            SELECT 
                d.category,
                d.file_type,
                COUNT(*) as document_count,
                SUM(d.file_size) as total_size_bytes,
                AVG(d.file_size) as avg_size_bytes,
                COUNT(DISTINCT d.project_id) as project_count,
                COUNT(DISTINCT d.created_by) as author_count
            FROM documents d
            ${whereClause}
            GROUP BY d.category, d.file_type
            ORDER BY document_count DESC;
        `;

        const stats = await executeQuery(statsQuery, params);

        // Évolution temporelle
        const timelineQuery = `
            SELECT 
                DATE_TRUNC('day', d.created_at) as date,
                COUNT(*) as documents_created,
                SUM(d.file_size) as total_size_bytes,
                COUNT(DISTINCT d.project_id) as projects_with_docs
            FROM documents d
            ${whereClause}
            GROUP BY DATE_TRUNC('day', d.created_at)
            ORDER BY date;
        `;

        const timeline = await executeQuery(timelineQuery, params);

        // Top auteurs
        const authorsQuery = `
            SELECT 
                u.name,
                COUNT(DISTINCT d.id) as documents_created,
                SUM(d.file_size) as total_size_bytes,
                COUNT(DISTINCT d.project_id) as projects_documented,
                COUNT(DISTINCT d.category) as categories_used
            FROM documents d
            JOIN users u ON u.id = d.created_by
            ${whereClause}
            GROUP BY u.id, u.name
            ORDER BY documents_created DESC
            LIMIT 15;
        `;

        const authors = await executeQuery(authorsQuery, params);

        res.json({
            success: true,
            data: {
                stats,
                timeline,
                topAuthors: authors,
                period,
                filters: { category, project_id }
            }
        });

    } catch (error) {
        console.error('Erreur analytics documents:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'analyse des documents' 
        });
    }
});

// Rapports personnalisés
app.post('/api/analytics/custom-report', authenticateToken, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            metrics, 
            filters, 
            groupBy, 
            period,
            format = 'json'
        } = req.body;

        // Validation des paramètres
        if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Métriques requises'
            });
        }

        // Construction dynamique de la requête
        let selectClause = '';
        let fromClause = '';
        let whereClause = 'WHERE 1=1';
        let groupByClause = '';
        let params = [];

        // Ajouter les métriques
        const metricMappings = {
            'project_count': 'COUNT(DISTINCT p.id)',
            'task_count': 'COUNT(DISTINCT t.id)',
            'document_count': 'COUNT(DISTINCT d.id)',
            'total_budget': 'SUM(p.budget)',
            'avg_completion_time': 'AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600)',
            'completion_rate': 'COUNT(CASE WHEN t.status = \'done\' THEN 1 END)::float / COUNT(t.id) * 100'
        };

        selectClause = metrics.map(metric => 
            metricMappings[metric] ? `${metricMappings[metric]} as ${metric}` : null
        ).filter(Boolean).join(', ');

        // Tables nécessaires
        fromClause = 'FROM projects p LEFT JOIN tasks t ON t.project_id = p.id LEFT JOIN documents d ON d.project_id = p.id';

        // Ajouter les filtres
        if (period) {
            whereClause += ` AND p.created_at >= $${params.length + 1}`;
            params.push(new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000));
        }

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    whereClause += ` AND ${key} = $${params.length + 1}`;
                    params.push(value);
                }
            });
        }

        // Groupement
        if (groupBy && groupBy.length > 0) {
            groupByClause = `GROUP BY ${groupBy.join(', ')}`;
            selectClause = `${groupBy.join(', ')}, ${selectClause}`;
        }

        const query = `SELECT ${selectClause} ${fromClause} ${whereClause} ${groupByClause}`;

        const results = await executeQuery(query, params);

        // Sauvegarder le rapport
        const saveReportQuery = `
            INSERT INTO custom_reports (name, description, query, parameters, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id;
        `;

        const reportId = await executeQuery(saveReportQuery, [
            name,
            description,
            query,
            JSON.stringify({ metrics, filters, groupBy, period }),
            req.user.id
        ]);

        res.json({
            success: true,
            data: {
                reportId: reportId[0]?.id,
                results,
                query: process.env.NODE_ENV === 'development' ? query : undefined,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur rapport personnalisé:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la génération du rapport' 
        });
    }
});

// Export de données
app.get('/api/analytics/export/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const { format = 'csv', period = '30d' } = req.query;

        let query = '';
        let filename = '';

        switch (type) {
            case 'projects':
                query = `
                    SELECT 
                        p.name,
                        p.status,
                        p.budget,
                        p.start_date,
                        p.end_date,
                        c.name as company_name,
                        COUNT(t.id) as task_count
                    FROM projects p
                    LEFT JOIN companies c ON c.id = p.company_id
                    LEFT JOIN tasks t ON t.project_id = p.id
                    WHERE p.created_at >= $1
                    GROUP BY p.id, p.name, p.status, p.budget, p.start_date, p.end_date, c.name
                    ORDER BY p.created_at DESC;
                `;
                filename = `projects_export_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'tasks':
                query = `
                    SELECT 
                        t.title,
                        t.status,
                        t.priority,
                        t.estimated_hours,
                        t.completion_percentage,
                        t.created_at,
                        t.due_date,
                        p.name as project_name,
                        u.name as assignee_name
                    FROM tasks t
                    LEFT JOIN projects p ON p.id = t.project_id
                    LEFT JOIN task_assignments ta ON ta.task_id = t.id
                    LEFT JOIN users u ON u.id = ta.user_id
                    WHERE t.created_at >= $1
                    ORDER BY t.created_at DESC;
                `;
                filename = `tasks_export_${new Date().toISOString().split('T')[0]}`;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Type d\'export non supporté'
                });
        }

        const data = await executeQuery(query, [
            new Date(Date.now() - (parseInt(period) || 30) * 24 * 60 * 60 * 1000)
        ]);

        if (format === 'csv') {
            // Conversion en CSV
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Aucune donnée à exporter'
                });
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => 
                        typeof row[header] === 'string' && row[header].includes(',') 
                            ? `"${row[header]}"` 
                            : row[header]
                    ).join(',')
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data,
                filename: `${filename}.json`,
                exportedAt: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'export' 
        });
    }
});

// Prédictions et tendances (IA basique)
app.get('/api/analytics/predictions', authenticateToken, async (req, res) => {
    try {
        const { type = 'projects', horizon = '30d' } = req.query;

        // Données historiques pour les prédictions
        const historicalQuery = `
            SELECT 
                DATE_TRUNC('week', created_at) as week,
                COUNT(*) as count
            FROM ${type}
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week;
        `;

        const historical = await executeQuery(historicalQuery);

        // Calcul de tendance simple (régression linéaire basique)
        if (historical.length < 4) {
            return res.json({
                success: true,
                data: {
                    prediction: 'Données insuffisantes pour prédiction',
                    trend: 'stable',
                    confidence: 0
                }
            });
        }

        const values = historical.map(h => parseInt(h.count));
        const n = values.length;
        const sumX = n * (n + 1) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
        const sumX2 = n * (n + 1) * (2 * n + 1) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Prédiction pour les prochaines semaines
        const weeksAhead = parseInt(horizon) / 7;
        const prediction = Math.round(slope * (n + weeksAhead) + intercept);
        
        const trend = slope > 0.1 ? 'croissante' : slope < -0.1 ? 'décroissante' : 'stable';
        const confidence = Math.min(Math.abs(slope) * 100, 95);

        res.json({
            success: true,
            data: {
                type,
                horizon,
                historical: historical.slice(-12), // 12 dernières semaines
                prediction: Math.max(0, prediction),
                trend,
                confidence: Math.round(confidence),
                slope: slope.toFixed(4),
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur prédictions:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors du calcul des prédictions' 
        });
    }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Erreur interne du serveur' 
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint non trouvé' 
    });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Analytics PrevHub démarrée sur le port ${PORT}`);
    console.log(`📊 Endpoints disponibles :`);
    console.log(`   - GET  /api/health - Health check`);
    console.log(`   - GET  /api/analytics/dashboard - Dashboard principal`);
    console.log(`   - GET  /api/analytics/projects - Analytics projets`);
    console.log(`   - GET  /api/analytics/tasks - Analytics tâches`);
    console.log(`   - GET  /api/analytics/clients - Analytics clients`);
    console.log(`   - GET  /api/analytics/documents - Analytics documents`);
    console.log(`   - POST /api/analytics/custom-report - Rapports personnalisés`);
    console.log(`   - GET  /api/analytics/export/:type - Export de données`);
    console.log(`   - GET  /api/analytics/predictions - Prédictions IA`);
    console.log(`🔐 Authentification JWT requise pour tous les endpoints`);
});

module.exports = app;

