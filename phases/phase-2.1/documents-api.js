// API ERP PrevHub - Phase 2.1 - Module Documents avec IA
// Backend Node.js avec Express et fonctionnalités IA

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3001;

// Configuration CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Configuration du stockage de fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = process.env.UPLOAD_PATH || './uploads/documents';
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    },
    fileFilter: function (req, file, cb) {
        // Types de fichiers autorisés
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'), false);
        }
    }
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite chaque IP à 100 requêtes par windowMs
});
app.use(limiter);

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'prevhub_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Fonction utilitaire pour calculer le hash d'un fichier
async function calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Fonction simulée d'extraction de texte (IA/OCR)
async function extractTextFromFile(filePath, mimeType) {
    // Simulation d'extraction de texte
    // En production, utiliser des services comme Tesseract OCR, AWS Textract, etc.
    
    const sampleTexts = {
        'application/pdf': 'Contenu extrait du PDF par OCR. Document analysé avec succès.',
        'application/msword': 'Contenu extrait du document Word. Texte analysé automatiquement.',
        'text/plain': 'Contenu du fichier texte lu directement.',
        'default': 'Contenu extrait par analyse automatique du document.'
    };
    
    return sampleTexts[mimeType] || sampleTexts['default'];
}

// Fonction simulée d'analyse IA
async function analyzeDocumentWithAI(extractedText, title, description) {
    // Simulation d'analyse IA
    // En production, utiliser des services comme OpenAI GPT, Google Cloud AI, etc.
    
    const text = `${title} ${description} ${extractedText}`.toLowerCase();
    
    // Génération de résumé
    const summary = `Résumé automatique : ${title}. ${description ? description.substring(0, 100) + '...' : 'Document analysé par IA.'}`;
    
    // Extraction de mots-clés
    const commonWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'un', 'une', 'pour', 'avec', 'dans', 'sur'];
    const words = text.split(/\s+/).filter(word => 
        word.length > 3 && !commonWords.includes(word)
    );
    const keywords = [...new Set(words)].slice(0, 10);
    
    // Classification automatique
    let aiCategory = 'Général';
    let confidence = 0.75;
    
    if (text.includes('contrat') || text.includes('accord')) {
        aiCategory = 'Contrats';
        confidence = 0.90;
    } else if (text.includes('facture') || text.includes('devis')) {
        aiCategory = 'Factures';
        confidence = 0.95;
    } else if (text.includes('rapport') || text.includes('analyse')) {
        aiCategory = 'Rapports';
        confidence = 0.85;
    } else if (text.includes('procédure') || text.includes('mode opératoire')) {
        aiCategory = 'Procédures';
        confidence = 0.88;
    } else if (text.includes('technique') || text.includes('spécification')) {
        aiCategory = 'Technique';
        confidence = 0.82;
    }
    
    return {
        summary,
        keywords,
        category: aiCategory,
        confidence
    };
}

// Routes API

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'PrevHub Documents API',
        version: '2.1.0',
        timestamp: new Date().toISOString()
    });
});

// 1. Obtenir la liste des documents avec filtres et pagination
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = '',
            category = '',
            status = '',
            priority = '',
            project_id = '',
            company_id = '',
            etablissement_id = '',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereConditions = ['d.is_latest_version = true'];
        let queryParams = [];
        let paramIndex = 1;

        // Filtres de recherche
        if (search) {
            whereConditions.push(`(
                d.title ILIKE $${paramIndex} OR 
                d.description ILIKE $${paramIndex} OR 
                d.extracted_text ILIKE $${paramIndex} OR
                d.ai_summary ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (category) {
            whereConditions.push(`d.category = $${paramIndex}`);
            queryParams.push(category);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`d.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (priority) {
            whereConditions.push(`d.priority = $${paramIndex}`);
            queryParams.push(priority);
            paramIndex++;
        }

        if (project_id) {
            whereConditions.push(`d.project_id = $${paramIndex}`);
            queryParams.push(project_id);
            paramIndex++;
        }

        if (company_id) {
            whereConditions.push(`d.company_id = $${paramIndex}`);
            queryParams.push(company_id);
            paramIndex++;
        }

        if (etablissement_id) {
            whereConditions.push(`d.etablissement_id = $${paramIndex}`);
            queryParams.push(etablissement_id);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Requête principale
        const query = `
            SELECT 
                d.*,
                dc.name as category_name,
                dc.color as category_color,
                dc.icon as category_icon,
                p.name as project_name,
                c.name as company_name,
                e.name as etablissement_name,
                (SELECT COUNT(*) FROM document_comments WHERE document_id = d.id AND status = 'active') as comments_count,
                (SELECT COUNT(*) FROM document_shares WHERE document_id = d.id) as shares_count,
                CASE 
                    WHEN d.updated_at > NOW() - INTERVAL '1 day' THEN 'new'
                    WHEN d.updated_at > NOW() - INTERVAL '7 days' THEN 'recent'
                    ELSE 'normal'
                END as freshness
            FROM documents d
            LEFT JOIN document_categories dc ON d.category = dc.name
            LEFT JOIN projects p ON d.project_id = p.id
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN etablissements e ON d.etablissement_id = e.id
            ${whereClause}
            ORDER BY d.${sort_by} ${sort_order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);

        const result = await pool.query(query, queryParams);

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM documents d
            ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            documents: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des documents:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des documents' });
    }
});

// 2. Obtenir un document par ID
app.get('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                d.*,
                dc.name as category_name,
                dc.color as category_color,
                dc.icon as category_icon,
                p.name as project_name,
                c.name as company_name,
                e.name as etablissement_name
            FROM documents d
            LEFT JOIN document_categories dc ON d.category = dc.name
            LEFT JOIN projects p ON d.project_id = p.id
            LEFT JOIN companies c ON d.company_id = c.id
            LEFT JOIN etablissements e ON d.etablissement_id = e.id
            WHERE d.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }

        // Enregistrer la consultation
        await pool.query(
            'INSERT INTO document_history (document_id, action, user_id, ip_address) VALUES ($1, $2, $3, $4)',
            [id, 'viewed', req.user.id, req.ip]
        );

        // Incrémenter le compteur de vues
        await pool.query(
            'UPDATE documents SET view_count = view_count + 1, last_accessed_at = NOW() WHERE id = $1',
            [id]
        );

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erreur lors de la récupération du document:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération du document' });
    }
});

// 3. Upload et création d'un nouveau document
app.post('/api/documents', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            tags,
            status = 'draft',
            priority = 'normal',
            confidentiality = 'internal',
            project_id,
            company_id,
            etablissement_id
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Fichier requis' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Titre requis' });
        }

        // Calculer le hash du fichier
        const fileHash = await calculateFileHash(req.file.path);

        // Vérifier si le fichier existe déjà
        const existingFile = await pool.query(
            'SELECT id, title FROM documents WHERE file_hash = $1',
            [fileHash]
        );

        if (existingFile.rows.length > 0) {
            // Supprimer le fichier uploadé en double
            await fs.unlink(req.file.path);
            return res.status(409).json({ 
                error: 'Fichier déjà existant',
                existing_document: existingFile.rows[0]
            });
        }

        // Extraire le texte du fichier
        const extractedText = await extractTextFromFile(req.file.path, req.file.mimetype);

        // Analyser avec IA
        const aiAnalysis = await analyzeDocumentWithAI(extractedText, title, description);

        // Insérer le document en base
        const insertQuery = `
            INSERT INTO documents (
                title, description, file_name, file_path, file_size, mime_type, file_hash,
                category, tags, status, priority, confidentiality,
                project_id, company_id, etablissement_id,
                extracted_text, ai_summary, ai_keywords, ai_category, ai_confidence,
                ai_processed_at, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, NOW(), $21
            ) RETURNING *
        `;

        const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

        const values = [
            title,
            description,
            req.file.originalname,
            req.file.path,
            req.file.size,
            req.file.mimetype,
            fileHash,
            category || aiAnalysis.category,
            tagsArray,
            status,
            priority,
            confidentiality,
            project_id || null,
            company_id || null,
            etablissement_id || null,
            extractedText,
            aiAnalysis.summary,
            aiAnalysis.keywords,
            aiAnalysis.category,
            aiAnalysis.confidence,
            req.user.id
        ];

        const result = await pool.query(insertQuery, values);

        // Enregistrer l'action
        await pool.query(
            'INSERT INTO document_history (document_id, action, action_details, user_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [result.rows[0].id, 'created', JSON.stringify({ version: 1 }), req.user.id, req.ip]
        );

        res.status(201).json({
            message: 'Document créé avec succès',
            document: result.rows[0],
            ai_analysis: aiAnalysis
        });

    } catch (error) {
        console.error('Erreur lors de la création du document:', error);
        
        // Supprimer le fichier en cas d'erreur
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Erreur lors de la suppression du fichier:', unlinkError);
            }
        }
        
        res.status(500).json({ error: 'Erreur serveur lors de la création du document' });
    }
});

// 4. Mettre à jour un document
app.put('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            category,
            tags,
            status,
            priority,
            confidentiality,
            project_id,
            company_id,
            etablissement_id
        } = req.body;

        // Vérifier que le document existe
        const existingDoc = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
        if (existingDoc.rows.length === 0) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }

        const updateQuery = `
            UPDATE documents SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                tags = COALESCE($4, tags),
                status = COALESCE($5, status),
                priority = COALESCE($6, priority),
                confidentiality = COALESCE($7, confidentiality),
                project_id = COALESCE($8, project_id),
                company_id = COALESCE($9, company_id),
                etablissement_id = COALESCE($10, etablissement_id),
                updated_by = $11,
                updated_at = NOW()
            WHERE id = $12
            RETURNING *
        `;

        const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : null;

        const values = [
            title,
            description,
            category,
            tagsArray,
            status,
            priority,
            confidentiality,
            project_id,
            company_id,
            etablissement_id,
            req.user.id,
            id
        ];

        const result = await pool.query(updateQuery, values);

        // Enregistrer l'action
        const changes = [];
        if (title && title !== existingDoc.rows[0].title) changes.push('title');
        if (description && description !== existingDoc.rows[0].description) changes.push('description');
        if (status && status !== existingDoc.rows[0].status) changes.push('status');

        await pool.query(
            'INSERT INTO document_history (document_id, action, action_details, user_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [id, 'updated', JSON.stringify({ changes }), req.user.id, req.ip]
        );

        res.json({
            message: 'Document mis à jour avec succès',
            document: result.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du document:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du document' });
    }
});

// 5. Supprimer un document
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que le document existe
        const existingDoc = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
        if (existingDoc.rows.length === 0) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }

        // Supprimer le fichier physique
        try {
            await fs.unlink(existingDoc.rows[0].file_path);
        } catch (fileError) {
            console.warn('Fichier physique non trouvé:', fileError.message);
        }

        // Supprimer le document de la base
        await pool.query('DELETE FROM documents WHERE id = $1', [id]);

        // Enregistrer l'action
        await pool.query(
            'INSERT INTO document_history (document_id, action, action_details, user_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [id, 'deleted', JSON.stringify({ title: existingDoc.rows[0].title }), req.user.id, req.ip]
        );

        res.json({ message: 'Document supprimé avec succès' });

    } catch (error) {
        console.error('Erreur lors de la suppression du document:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression du document' });
    }
});

// 6. Recherche avancée de documents
app.get('/api/documents/search', authenticateToken, async (req, res) => {
    try {
        const { q, limit = 20, offset = 0 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Terme de recherche requis' });
        }

        const result = await pool.query(
            'SELECT * FROM search_documents($1, $2, $3)',
            [q, limit, offset]
        );

        res.json({
            results: result.rows,
            query: q,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la recherche' });
    }
});

// 7. Obtenir les catégories de documents
app.get('/api/documents/categories', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                dc.*,
                COUNT(d.id) as documents_count
            FROM document_categories dc
            LEFT JOIN documents d ON dc.name = d.category AND d.is_latest_version = true
            GROUP BY dc.id
            ORDER BY dc.name
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des catégories' });
    }
});

// 8. Obtenir les statistiques des documents
app.get('/api/documents/stats', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM get_document_stats()');
        
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
    }
});

// 9. Télécharger un document
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT file_path, file_name, mime_type FROM documents WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }

        const document = result.rows[0];

        // Vérifier que le fichier existe
        try {
            await fs.access(document.file_path);
        } catch (error) {
            return res.status(404).json({ error: 'Fichier physique non trouvé' });
        }

        // Enregistrer le téléchargement
        await pool.query(
            'UPDATE documents SET download_count = download_count + 1 WHERE id = $1',
            [id]
        );

        await pool.query(
            'INSERT INTO document_history (document_id, action, action_details, user_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [id, 'downloaded', JSON.stringify({ format: path.extname(document.file_name) }), req.user.id, req.ip]
        );

        // Envoyer le fichier
        res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
        res.setHeader('Content-Type', document.mime_type);
        res.sendFile(path.resolve(document.file_path));

    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        res.status(500).json({ error: 'Erreur serveur lors du téléchargement' });
    }
});

// 10. Obtenir les commentaires d'un document
app.get('/api/documents/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                dc.*,
                COUNT(replies.id) as replies_count
            FROM document_comments dc
            LEFT JOIN document_comments replies ON replies.parent_comment_id = dc.id
            WHERE dc.document_id = $1 AND dc.parent_comment_id IS NULL AND dc.status = 'active'
            GROUP BY dc.id
            ORDER BY dc.created_at DESC
        `, [id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des commentaires' });
    }
});

// 11. Ajouter un commentaire à un document
app.post('/api/documents/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, comment_type = 'comment', parent_comment_id } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Contenu du commentaire requis' });
        }

        const result = await pool.query(`
            INSERT INTO document_comments (document_id, parent_comment_id, content, comment_type, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, parent_comment_id || null, content, comment_type, req.user.id]);

        res.status(201).json({
            message: 'Commentaire ajouté avec succès',
            comment: result.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du commentaire' });
    }
});

// 12. Obtenir les templates de documents
app.get('/api/documents/templates', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                dt.*,
                dc.name as category_name
            FROM document_templates dt
            LEFT JOIN document_categories dc ON dt.category_id = dc.id
            WHERE dt.is_active = true
            ORDER BY dt.name
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Erreur lors de la récupération des templates:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des templates' });
    }
});

// Gestion des erreurs globales
app.use((error, req, res, next) => {
    console.error('Erreur non gérée:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Fichier trop volumineux (max 50MB)' });
        }
    }
    
    res.status(500).json({ error: 'Erreur serveur interne' });
});

// Démarrage du serveur
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API Documents PrevHub démarrée sur le port ${port}`);
    console.log(`📄 Module Documents avec IA - Phase 2.1`);
    console.log(`🔗 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;

