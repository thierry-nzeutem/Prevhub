const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// Configuration CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'prevhub_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'prevhub',
  password: process.env.DB_PASSWORD || 'prevhub_password',
  port: process.env.DB_PORT || 5432,
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'prevhub_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Routes de base
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Authentification
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Pour la démo, accepter les comptes de test
    const demoAccounts = {
      'admin@preveris.fr': { id: 1, name: 'Admin Prévéris', role: 'admin' },
      'test@preveris.fr': { id: 2, name: 'Utilisateur Test', role: 'user' }
    };

    if (demoAccounts[email] && password === 'password123') {
      const user = demoAccounts[email];
      const token = jwt.sign(
        { id: user.id, email, role: user.role },
        process.env.JWT_SECRET || 'prevhub_secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: { id: user.id, email, name: user.name, role: user.role }
      });
    } else {
      res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Projets enrichie
app.get('/api/projects', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      priority = '',
      client_id = '',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construction de la requête avec filtres
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

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

    if (priority) {
      whereConditions.push(`p.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }

    if (client_id) {
      whereConditions.push(`p.client_id = $${paramIndex}`);
      queryParams.push(client_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Requête principale avec jointures
    const query = `
      SELECT 
        p.*,
        c.name as client_name,
        c.email as client_email,
        e.name as etablissement_name,
        e.address as etablissement_address,
        COUNT(*) OVER() as total_count
      FROM projects p
      LEFT JOIN companies c ON p.client_id = c.id
      LEFT JOIN etablissements e ON p.etablissement_id = e.id
      ${whereClause}
      ORDER BY p.${sort_by} ${sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: result.rows.map(row => {
        const { total_count, ...project } = row;
        return project;
      }),
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un projet
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      client_id,
      etablissement_id,
      status = 'draft',
      priority = 'medium',
      start_date,
      end_date,
      budget,
      assigned_to
    } = req.body;

    const query = `
      INSERT INTO projects (
        name, description, client_id, etablissement_id, status, priority,
        start_date, end_date, budget, assigned_to, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      name, description, client_id, etablissement_id, status, priority,
      start_date, end_date, budget, assigned_to, req.user.id
    ];

    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Projet créé avec succès'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtenir un projet spécifique
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        e.name as etablissement_name,
        e.address as etablissement_address,
        e.city as etablissement_city,
        u.name as assigned_user_name,
        creator.name as created_by_name
      FROM projects p
      LEFT JOIN companies c ON p.client_id = c.id
      LEFT JOIN etablissements e ON p.etablissement_id = e.id
      LEFT JOIN users u ON p.assigned_to = u.id
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour un projet
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      client_id,
      etablissement_id,
      status,
      priority,
      start_date,
      end_date,
      budget,
      assigned_to
    } = req.body;

    const query = `
      UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        client_id = COALESCE($3, client_id),
        etablissement_id = COALESCE($4, etablissement_id),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        start_date = COALESCE($7, start_date),
        end_date = COALESCE($8, end_date),
        budget = COALESCE($9, budget),
        assigned_to = COALESCE($10, assigned_to),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      name, description, client_id, etablissement_id, status, priority,
      start_date, end_date, budget, assigned_to, id
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Projet mis à jour avec succès'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer un projet
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Projet non trouvé' });
    }

    res.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Entreprises (données Supabase)
app.get('/api/companies', async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;
    
    let query = 'SELECT * FROM companies';
    let queryParams = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR email ILIKE $1';
      queryParams.push(`%${search}%`);
    }
    
    query += ' ORDER BY name LIMIT $' + (queryParams.length + 1);
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Établissements
app.get('/api/etablissements', async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;
    
    let query = 'SELECT * FROM etablissements';
    let queryParams = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR address ILIKE $1 OR city ILIKE $1';
      queryParams.push(`%${search}%`);
    }
    
    query += ' ORDER BY name LIMIT $' + (queryParams.length + 1);
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistiques du tableau de bord
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM projects'),
      pool.query('SELECT COUNT(*) as count FROM projects WHERE status = $1', ['active']),
      pool.query('SELECT COUNT(*) as count FROM companies'),
      pool.query('SELECT COUNT(*) as count FROM etablissements'),
      pool.query('SELECT COUNT(*) as count FROM projects WHERE status = $1', ['completed']),
      pool.query('SELECT COUNT(*) as count FROM projects WHERE priority = $1', ['high'])
    ]);

    res.json({
      success: true,
      data: {
        total_projects: parseInt(stats[0].rows[0].count),
        active_projects: parseInt(stats[1].rows[0].count),
        total_companies: parseInt(stats[2].rows[0].count),
        total_etablissements: parseInt(stats[3].rows[0].count),
        completed_projects: parseInt(stats[4].rows[0].count),
        high_priority_projects: parseInt(stats[5].rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Serveur ERP PrevHub démarré sur le port ${port}`);
  console.log(`📊 API disponible sur http://0.0.0.0:${port}/api`);
});

