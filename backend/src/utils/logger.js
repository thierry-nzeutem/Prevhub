/**
 * Configuration du système de logging avec Winston
 * Auteur: Manus AI
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Création du répertoire de logs
const logDir = path.join(__dirname, '../../logs');

// Configuration des formats
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Configuration des transports
const transports = [
  // Console pour le développement
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: consoleFormat
  }),

  // Fichier pour toutes les logs
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    level: 'info'
  }),

  // Fichier séparé pour les erreurs
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error'
  }),

  // Fichier pour les accès API
  new DailyRotateFile({
    filename: path.join(logDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: logFormat,
    level: 'http'
  })
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Ajout de méthodes personnalisées
logger.api = (message, meta = {}) => {
  logger.log('http', message, meta);
};

logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, meta);
};

logger.performance = (message, meta = {}) => {
  logger.info(`[PERFORMANCE] ${message}`, meta);
};

logger.audit = (message, meta = {}) => {
  logger.info(`[AUDIT] ${message}`, meta);
};

// Gestion des erreurs non capturées
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
);

logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
);

module.exports = logger;

