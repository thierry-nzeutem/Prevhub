/**
 * Application principale ERP PrevHub avec authentification
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour le développement
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par windowMs
});
app.use('/api/', limiter);

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes publiques
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ERP PrevHub API opérationnelle',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes d'authentification
app.use('/api/auth', require('./routes/authRoutes'));

// Routes protégées (nécessitent une authentification)
const { verifyToken } = require('./middleware/authJWT');

app.use('/api/users', verifyToken, require('./routes/users'));
app.use('/api/projects', verifyToken, require('./routes/projects'));
app.use('/api/organizations', verifyToken, require('./routes/organizations'));
app.use('/api/documents', verifyToken, require('./routes/documents'));
app.use('/api/tasks', verifyToken, require('./routes/tasks'));
app.use('/api/quotes', verifyToken, require('./routes/quotes'));
app.use('/api/invoices', verifyToken, require('./routes/invoices'));
app.use('/api/dashboard', verifyToken, require('./routes/dashboard'));

// Route IA (protégée)
app.use('/api/ai', verifyToken, require('./routes/ai'));

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Middleware de gestion d'erreurs
app.use((error, req, res, next) => {
  logger.error('Erreur serveur:', error);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 ERP PrevHub API démarrée sur le port ${PORT}`);
  logger.info(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
