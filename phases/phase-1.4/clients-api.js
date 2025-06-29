// API enrichies pour la gestion des clients et établissements - Phase 1.4
// Extension du backend Node.js existant

const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Configuration CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration de la base de données
const pool = new Pool({
  user: process.env.DB_USER || 'prevhub_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'prevhub',
  password: process.env.DB_PASSWORD || 'prevhub_password',
  port: process.env.DB_PORT || 5432,
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'prevhub_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Fonction utilitaire pour la pagination
const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 12, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Fonction utilitaire pour construire les clauses WHERE
const buildWhereClause = (filters, tableName = '') => {
  const conditions = [];
  const values = [];
  let paramCount = 1;

  const prefix = tableName ? `${tableName}.` : '';

  if (filters.search) {
    conditions.push(`(
      ${prefix}name ILIKE $${paramCount} OR 
      ${prefix}email ILIKE $${paramCount} OR 
      ${prefix}city ILIKE $${paramCount} OR 
      ${prefix}description ILIKE $${paramCount}
    )`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.sector) {
    conditions.push(`${prefix}sector = $${paramCount}`);
    values.push(filters.sector);
    paramCount++;
  }

  if (filters.size) {
    conditions.push(`${prefix}size = $${paramCount}`);
    values.push(filters.size);
    paramCount++;
  }

  if (filters.location) {
    conditions.push(`${prefix}city ILIKE $${paramCount}`);
    values.push(`%${filters.location}%`);
    paramCount++;
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    paramCount
  };
};

// ==================== API ENTREPRISES ====================

// GET /api/companies - Liste des entreprises avec filtres avancés
app.get('/api/companies', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const { sort_by = 'name', sort_order = 'ASC' } = req.query;
    
    const filters = {
      search: req.query.search,
      sector: req.query.sector,
      size: req.query.size,
      location: req.query.location
    };

    const { whereClause, values } = buildWhereClause(filters, 'c');

    // Requête principale avec jointures pour les statistiques
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as etablissements_count,
        COUNT(DISTINCT p.id) as projects_count,
        MAX(p.created_at) as last_project_date
      FROM companies c
      LEFT JOIN etablissements e ON e.company_id = c.id
      LEFT JOIN projects p ON p.client_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${sort_by} ${sort_order}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    // Requête pour le total
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM companies c
      LEFT JOIN etablissements e ON e.company_id = c.id
      LEFT JOIN projects p ON p.client_id = c.id
      ${whereClause}
    `;

    const [companiesResult, countResult] = await Promise.all([
      pool.query(query, [...values, limit, offset]),
      pool.query(countQuery, values)
    ]);

    const total_count = parseInt(countResult.rows[0].total);
    const total_pages = Math.ceil(total_count / limit);

    res.json({
      success: true,
      data: companiesResult.rows,
      pagination: {
        current_page: page,
        total_pages,
        total_count,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/companies/:id - Détail d'une entreprise
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as etablissements_count,
        COUNT(DISTINCT p.id) as projects_count,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects_count,
        SUM(CASE WHEN p.budget IS NOT NULL THEN p.budget ELSE 0 END) as total_budget
      FROM companies c
      LEFT JOIN etablissements e ON e.company_id = c.id
      LEFT JOIN projects p ON p.client_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
    }

    // Récupérer les établissements associés
    const etablissementsQuery = `
      SELECT * FROM etablissements 
      WHERE company_id = $1 
      ORDER BY name ASC
    `;
    const etablissementsResult = await pool.query(etablissementsQuery, [id]);

    // Récupérer les projets récents
    const projectsQuery = `
      SELECT * FROM projects 
      WHERE client_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const projectsResult = await pool.query(projectsQuery, [id]);

    const company = result.rows[0];
    company.etablissements = etablissementsResult.rows;
    company.recent_projects = projectsResult.rows;

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'entreprise:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/companies - Créer une nouvelle entreprise
app.post('/api/companies', authenticateToken, async (req, res) => {
  try {
    const {
      name, email, phone, address, city, postal_code, country,
      sector, size, website, siret, description,
      contact_person, contact_email, contact_phone
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Le nom de l\'entreprise est requis' });
    }

    const query = `
      INSERT INTO companies (
        name, email, phone, address, city, postal_code, country,
        sector, size, website, siret, description,
        contact_person, contact_email, contact_phone,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      name, email, phone, address, city, postal_code, country || 'France',
      sector, size, website, siret, description,
      contact_person, contact_email, contact_phone
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Entreprise créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    if (error.code === '23505') { // Violation de contrainte unique
      res.status(400).json({ success: false, error: 'Cette entreprise existe déjà' });
    } else {
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
});

// PUT /api/companies/:id - Mettre à jour une entreprise
app.put('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, address, city, postal_code, country,
      sector, size, website, siret, description,
      contact_person, contact_email, contact_phone
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Le nom de l\'entreprise est requis' });
    }

    const query = `
      UPDATE companies SET
        name = $1, email = $2, phone = $3, address = $4, city = $5,
        postal_code = $6, country = $7, sector = $8, size = $9,
        website = $10, siret = $11, description = $12,
        contact_person = $13, contact_email = $14, contact_phone = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      name, email, phone, address, city, postal_code, country || 'France',
      sector, size, website, siret, description,
      contact_person, contact_email, contact_phone, id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Entreprise mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'entreprise:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/companies/:id - Supprimer une entreprise
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier s'il y a des projets associés
    const projectsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE client_id = $1',
      [id]
    );

    if (parseInt(projectsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer une entreprise ayant des projets associés'
      });
    }

    // Supprimer les établissements associés d'abord
    await pool.query('DELETE FROM etablissements WHERE company_id = $1', [id]);

    // Supprimer l'entreprise
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée' });
    }

    res.json({
      success: true,
      message: 'Entreprise supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'entreprise:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ==================== API ÉTABLISSEMENTS ====================

// GET /api/etablissements - Liste des établissements avec filtres avancés
app.get('/api/etablissements', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const { sort_by = 'name', sort_order = 'ASC' } = req.query;
    
    const filters = {
      search: req.query.search,
      sector: req.query.sector,
      location: req.query.location
    };

    const { whereClause, values } = buildWhereClause(filters, 'e');

    // Requête principale avec jointures
    const query = `
      SELECT 
        e.*,
        c.name as company_name,
        c.sector as company_sector,
        COUNT(DISTINCT p.id) as projects_count,
        MAX(p.created_at) as last_project_date
      FROM etablissements e
      LEFT JOIN companies c ON c.id = e.company_id
      LEFT JOIN projects p ON p.etablissement_id = e.id
      ${whereClause}
      GROUP BY e.id, c.name, c.sector
      ORDER BY ${sort_by} ${sort_order}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    // Requête pour le total
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM etablissements e
      LEFT JOIN companies c ON c.id = e.company_id
      LEFT JOIN projects p ON p.etablissement_id = e.id
      ${whereClause}
    `;

    const [etablissementsResult, countResult] = await Promise.all([
      pool.query(query, [...values, limit, offset]),
      pool.query(countQuery, values)
    ]);

    const total_count = parseInt(countResult.rows[0].total);
    const total_pages = Math.ceil(total_count / limit);

    res.json({
      success: true,
      data: etablissementsResult.rows,
      pagination: {
        current_page: page,
        total_pages,
        total_count,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des établissements:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/etablissements/:id - Détail d'un établissement
app.get('/api/etablissements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        e.*,
        c.name as company_name,
        c.sector as company_sector,
        c.email as company_email,
        c.phone as company_phone,
        COUNT(DISTINCT p.id) as projects_count,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects_count,
        SUM(CASE WHEN p.budget IS NOT NULL THEN p.budget ELSE 0 END) as total_budget
      FROM etablissements e
      LEFT JOIN companies c ON c.id = e.company_id
      LEFT JOIN projects p ON p.etablissement_id = e.id
      WHERE e.id = $1
      GROUP BY e.id, c.name, c.sector, c.email, c.phone
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Établissement non trouvé' });
    }

    // Récupérer les projets récents
    const projectsQuery = `
      SELECT * FROM projects 
      WHERE etablissement_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const projectsResult = await pool.query(projectsQuery, [id]);

    const etablissement = result.rows[0];
    etablissement.recent_projects = projectsResult.rows;

    res.json({
      success: true,
      data: etablissement
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'établissement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/etablissements - Créer un nouveau établissement
app.post('/api/etablissements', authenticateToken, async (req, res) => {
  try {
    const {
      name, email, phone, address, city, postal_code, country,
      website, siret, description, contact_person, contact_email, contact_phone,
      company_id
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Le nom de l\'établissement est requis' });
    }

    const query = `
      INSERT INTO etablissements (
        name, email, phone, address, city, postal_code, country,
        website, siret, description, contact_person, contact_email, contact_phone,
        company_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      name, email, phone, address, city, postal_code, country || 'France',
      website, siret, description, contact_person, contact_email, contact_phone,
      company_id
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Établissement créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'établissement:', error);
    if (error.code === '23505') { // Violation de contrainte unique
      res.status(400).json({ success: false, error: 'Cet établissement existe déjà' });
    } else {
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
});

// PUT /api/etablissements/:id - Mettre à jour un établissement
app.put('/api/etablissements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, address, city, postal_code, country,
      website, siret, description, contact_person, contact_email, contact_phone,
      company_id
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Le nom de l\'établissement est requis' });
    }

    const query = `
      UPDATE etablissements SET
        name = $1, email = $2, phone = $3, address = $4, city = $5,
        postal_code = $6, country = $7, website = $8, siret = $9,
        description = $10, contact_person = $11, contact_email = $12,
        contact_phone = $13, company_id = $14, updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      name, email, phone, address, city, postal_code, country || 'France',
      website, siret, description, contact_person, contact_email, contact_phone,
      company_id, id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Établissement non trouvé' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Établissement mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'établissement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/etablissements/:id - Supprimer un établissement
app.delete('/api/etablissements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier s'il y a des projets associés
    const projectsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE etablissement_id = $1',
      [id]
    );

    if (parseInt(projectsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer un établissement ayant des projets associés'
      });
    }

    const result = await pool.query('DELETE FROM etablissements WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Établissement non trouvé' });
    }

    res.json({
      success: true,
      message: 'Établissement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'établissement:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ==================== API STATISTIQUES CLIENTS ====================

// GET /api/clients/stats - Statistiques détaillées des clients
app.get('/api/clients/stats', async (req, res) => {
  try {
    const queries = [
      // Statistiques générales
      `SELECT 
        COUNT(DISTINCT c.id) as total_companies,
        COUNT(DISTINCT e.id) as total_etablissements,
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects
      FROM companies c
      LEFT JOIN etablissements e ON e.company_id = c.id
      LEFT JOIN projects p ON p.client_id = c.id OR p.etablissement_id = e.id`,

      // Répartition par secteur
      `SELECT 
        sector,
        COUNT(*) as count
      FROM companies 
      WHERE sector IS NOT NULL
      GROUP BY sector
      ORDER BY count DESC`,

      // Répartition par taille d'entreprise
      `SELECT 
        size,
        COUNT(*) as count
      FROM companies 
      WHERE size IS NOT NULL
      GROUP BY size
      ORDER BY 
        CASE size
          WHEN 'TPE' THEN 1
          WHEN 'PME' THEN 2
          WHEN 'ETI' THEN 3
          WHEN 'GE' THEN 4
        END`,

      // Top 10 des villes
      `SELECT 
        city,
        COUNT(*) as count
      FROM (
        SELECT city FROM companies WHERE city IS NOT NULL
        UNION ALL
        SELECT city FROM etablissements WHERE city IS NOT NULL
      ) cities
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10`,

      // Clients les plus actifs (par nombre de projets)
      `SELECT 
        c.name,
        c.id,
        COUNT(p.id) as projects_count,
        SUM(CASE WHEN p.budget IS NOT NULL THEN p.budget ELSE 0 END) as total_budget
      FROM companies c
      LEFT JOIN projects p ON p.client_id = c.id
      GROUP BY c.id, c.name
      HAVING COUNT(p.id) > 0
      ORDER BY projects_count DESC, total_budget DESC
      LIMIT 10`
    ];

    const [generalStats, sectorStats, sizeStats, cityStats, topClients] = await Promise.all(
      queries.map(query => pool.query(query))
    );

    res.json({
      success: true,
      data: {
        general: generalStats.rows[0],
        by_sector: sectorStats.rows,
        by_size: sizeStats.rows,
        by_city: cityStats.rows,
        top_clients: topClients.rows
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques clients:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ==================== API RECHERCHE AVANCÉE ====================

// GET /api/clients/search - Recherche unifiée entreprises + établissements
app.get('/api/clients/search', async (req, res) => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Terme de recherche trop court (minimum 2 caractères)' });
    }

    const searchTerm = `%${q}%`;
    let results = [];

    if (type === 'all' || type === 'companies') {
      const companiesQuery = `
        SELECT 
          'company' as type,
          id,
          name,
          email,
          city,
          sector,
          size,
          description
        FROM companies
        WHERE 
          name ILIKE $1 OR 
          email ILIKE $1 OR 
          city ILIKE $1 OR 
          description ILIKE $1
        ORDER BY 
          CASE 
            WHEN name ILIKE $1 THEN 1
            WHEN email ILIKE $1 THEN 2
            ELSE 3
          END,
          name
        LIMIT $2
      `;
      
      const companiesResult = await pool.query(companiesQuery, [searchTerm, limit]);
      results = results.concat(companiesResult.rows);
    }

    if (type === 'all' || type === 'etablissements') {
      const etablissementsQuery = `
        SELECT 
          'etablissement' as type,
          e.id,
          e.name,
          e.email,
          e.city,
          e.description,
          c.name as company_name
        FROM etablissements e
        LEFT JOIN companies c ON c.id = e.company_id
        WHERE 
          e.name ILIKE $1 OR 
          e.email ILIKE $1 OR 
          e.city ILIKE $1 OR 
          e.description ILIKE $1 OR
          c.name ILIKE $1
        ORDER BY 
          CASE 
            WHEN e.name ILIKE $1 THEN 1
            WHEN e.email ILIKE $1 THEN 2
            ELSE 3
          END,
          e.name
        LIMIT $2
      `;
      
      const etablissementsResult = await pool.query(etablissementsQuery, [searchTerm, limit]);
      results = results.concat(etablissementsResult.rows);
    }

    // Trier les résultats par pertinence
    results.sort((a, b) => {
      const aScore = a.name.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
      const bScore = b.name.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
      return bScore - aScore;
    });

    res.json({
      success: true,
      data: results.slice(0, limit),
      total: results.length
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'API Clients Phase 1.4 opérationnelle',
      timestamp: result.rows[0].now,
      version: '1.4.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur de connexion à la base de données'
    });
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint non trouvé'
  });
});

// Gestion globale des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur non gérée:', error);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Clients Phase 1.4 démarrée sur le port ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET  /api/companies - Liste des entreprises`);
  console.log(`   POST /api/companies - Créer une entreprise`);
  console.log(`   GET  /api/companies/:id - Détail entreprise`);
  console.log(`   PUT  /api/companies/:id - Modifier entreprise`);
  console.log(`   DELETE /api/companies/:id - Supprimer entreprise`);
  console.log(`   GET  /api/etablissements - Liste des établissements`);
  console.log(`   POST /api/etablissements - Créer un établissement`);
  console.log(`   GET  /api/etablissements/:id - Détail établissement`);
  console.log(`   PUT  /api/etablissements/:id - Modifier établissement`);
  console.log(`   DELETE /api/etablissements/:id - Supprimer établissement`);
  console.log(`   GET  /api/clients/stats - Statistiques clients`);
  console.log(`   GET  /api/clients/search - Recherche unifiée`);
  console.log(`   GET  /api/health - Health check`);
});

module.exports = app;

