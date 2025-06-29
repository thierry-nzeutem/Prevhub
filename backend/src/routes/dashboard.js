/**
 * Routes du tableau de bord
 * Auteur: Manus AI
 */

const express = require('express');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Statistiques générales du tableau de bord
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  // Filtrage par rôle
  const userFilter = (userRole === 'user' || userRole === 'preventionist') 
    ? `WHERE assigned_user_id = '${userId}'` 
    : '';

  // Statistiques des projets
  const projectsStats = await query(`
    SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as active_projects,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_projects,
      COUNT(CASE WHEN status = 'REVIEW' THEN 1 END) as review_projects,
      COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'COMPLETED' THEN 1 END) as overdue_projects
    FROM projects ${userFilter}
  `);

  // Statistiques des tâches
  const tasksStats = await query(`
    SELECT 
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) as pending_tasks,
      COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as active_tasks,
      COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'DONE' THEN 1 END) as overdue_tasks
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    ${userFilter ? `WHERE (t.assigned_to = '${userId}' OR p.assigned_user_id = '${userId}')` : ''}
  `);

  // Statistiques des documents
  const documentsStats = await query(`
    SELECT 
      COUNT(*) as total_documents,
      COUNT(CASE WHEN d.ai_analysis_status = 'PENDING' THEN 1 END) as pending_analysis,
      COUNT(CASE WHEN d.ai_analysis_status = 'COMPLETED' THEN 1 END) as analyzed_documents,
      COUNT(CASE WHEN d.type = 'NOTICE' THEN 1 END) as notices_count
    FROM documents d
    LEFT JOIN projects p ON d.project_id = p.id
    ${userFilter ? `WHERE p.assigned_user_id = '${userId}'` : ''}
  `);

  // Statistiques financières (pour les rôles autorisés)
  let financialStats = null;
  if (['admin', 'manager', 'commercial'].includes(userRole)) {
    const financial = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN q.status = 'SENT' THEN q.total_amount END), 0) as pending_quotes,
        COALESCE(SUM(CASE WHEN q.status = 'ACCEPTED' THEN q.total_amount END), 0) as accepted_quotes,
        COALESCE(SUM(CASE WHEN i.status = 'SENT' THEN i.total_amount END), 0) as pending_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'PAID' THEN i.total_amount END), 0) as paid_invoices,
        COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'PAID' THEN 1 END) as overdue_invoices
      FROM quotes q
      FULL OUTER JOIN invoices i ON q.id = i.quote_id
    `);
    financialStats = financial.rows[0];
  }

  // Projets récents
  const recentProjects = await query(`
    SELECT p.id, p.name, p.status, p.type, p.created_at,
           o.name as organization_name
    FROM projects p
    LEFT JOIN organizations o ON p.organization_id = o.id
    ${userFilter}
    ORDER BY p.created_at DESC
    LIMIT 5
  `);

  // Tâches urgentes
  const urgentTasks = await query(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date,
           p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.status != 'DONE' 
    AND (t.priority = 'URGENT' OR t.due_date < CURRENT_DATE + INTERVAL '3 days')
    ${userFilter ? `AND (t.assigned_to = '${userId}' OR p.assigned_user_id = '${userId}')` : ''}
    ORDER BY t.due_date ASC, t.priority DESC
    LIMIT 10
  `);

  // Activité récente
  const recentActivity = await query(`
    SELECT entity_type, entity_id, action, details, created_at,
           u.first_name, u.last_name
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `);

  res.json({
    stats: {
      projects: projectsStats.rows[0],
      tasks: tasksStats.rows[0],
      documents: documentsStats.rows[0],
      financial: financialStats
    },
    recent_projects: recentProjects.rows,
    urgent_tasks: urgentTasks.rows,
    recent_activity: recentActivity.rows
  });
}));

// Graphiques pour le tableau de bord
router.get('/charts', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // Période en jours
  const userId = req.user.id;
  const userRole = req.user.role;

  const userFilter = (userRole === 'user' || userRole === 'preventionist') 
    ? `AND assigned_user_id = '${userId}'` 
    : '';

  // Évolution des projets par mois
  const projectsEvolution = await query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as count,
      status
    FROM projects 
    WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days' ${userFilter}
    GROUP BY DATE_TRUNC('month', created_at), status
    ORDER BY month
  `);

  // Répartition par type de projet
  const projectsByType = await query(`
    SELECT type, COUNT(*) as count
    FROM projects 
    WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days' ${userFilter}
    GROUP BY type
  `);

  // Charge de travail par utilisateur (pour les managers/admins)
  let workloadByUser = [];
  if (['admin', 'manager'].includes(userRole)) {
    const workload = await query(`
      SELECT 
        u.first_name, u.last_name,
        COUNT(p.id) as projects_count,
        COUNT(t.id) as tasks_count
      FROM users u
      LEFT JOIN projects p ON u.id = p.assigned_user_id
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status != 'DONE'
      WHERE u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY projects_count DESC
    `);
    workloadByUser = workload.rows;
  }

  res.json({
    projects_evolution: projectsEvolution.rows,
    projects_by_type: projectsByType.rows,
    workload_by_user: workloadByUser
  });
}));

module.exports = router;

