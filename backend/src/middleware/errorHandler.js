/**
 * Middleware de gestion d'erreurs
 * Auteur: Manus AI
 */

const logger = require('../utils/logger');

/**
 * Classe d'erreur personnalisée pour l'API
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreurs prédéfinies
 */
const ErrorTypes = {
  VALIDATION_ERROR: (message, details) => new ApiError(message, 400, 'VALIDATION_ERROR', details),
  NOT_FOUND: (resource) => new ApiError(`${resource} non trouvé`, 404, 'NOT_FOUND'),
  UNAUTHORIZED: (message = 'Non autorisé') => new ApiError(message, 401, 'UNAUTHORIZED'),
  FORBIDDEN: (message = 'Accès interdit') => new ApiError(message, 403, 'FORBIDDEN'),
  CONFLICT: (message) => new ApiError(message, 409, 'CONFLICT'),
  INTERNAL_ERROR: (message = 'Erreur interne du serveur') => new ApiError(message, 500, 'INTERNAL_ERROR'),
  BAD_REQUEST: (message) => new ApiError(message, 400, 'BAD_REQUEST'),
  TOO_MANY_REQUESTS: (message = 'Trop de requêtes') => new ApiError(message, 429, 'TOO_MANY_REQUESTS')
};

/**
 * Convertit les erreurs de base de données en erreurs API
 */
const handleDatabaseError = (error) => {
  logger.error('Erreur base de données:', error);

  // Erreur de contrainte unique
  if (error.code === '23505') {
    const field = error.detail?.match(/Key \((.+)\)=/)?.[1] || 'champ';
    return ErrorTypes.CONFLICT(`Cette valeur existe déjà pour le champ: ${field}`);
  }

  // Erreur de contrainte de clé étrangère
  if (error.code === '23503') {
    return ErrorTypes.BAD_REQUEST('Référence invalide vers un élément inexistant');
  }

  // Erreur de contrainte NOT NULL
  if (error.code === '23502') {
    const field = error.column || 'champ requis';
    return ErrorTypes.VALIDATION_ERROR(`Le champ ${field} est obligatoire`);
  }

  // Erreur de type de données
  if (error.code === '22P02') {
    return ErrorTypes.VALIDATION_ERROR('Format de données invalide');
  }

  // Erreur de connexion
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return ErrorTypes.INTERNAL_ERROR('Service temporairement indisponible');
  }

  // Erreur générique
  return ErrorTypes.INTERNAL_ERROR('Erreur de base de données');
};

/**
 * Convertit les erreurs de validation en erreurs API
 */
const handleValidationError = (error) => {
  if (error.name === 'ValidationError') {
    const details = error.details?.map(detail => ({
      field: detail.path?.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return ErrorTypes.VALIDATION_ERROR('Erreur de validation', details);
  }

  return error;
};

/**
 * Middleware principal de gestion d'erreurs
 */
const errorHandler = (error, req, res, next) => {
  let apiError = error;

  // Conversion des erreurs selon leur type
  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      apiError = handleValidationError(error);
    } else if (error.code && error.code.startsWith('23')) {
      apiError = handleDatabaseError(error);
    } else if (error.name === 'JsonWebTokenError') {
      apiError = ErrorTypes.UNAUTHORIZED('Token JWT invalide');
    } else if (error.name === 'TokenExpiredError') {
      apiError = ErrorTypes.UNAUTHORIZED('Token JWT expiré');
    } else if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        apiError = ErrorTypes.BAD_REQUEST('Fichier trop volumineux');
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        apiError = ErrorTypes.BAD_REQUEST('Trop de fichiers');
      } else {
        apiError = ErrorTypes.BAD_REQUEST('Erreur de téléchargement de fichier');
      }
    } else {
      // Erreur non gérée
      apiError = ErrorTypes.INTERNAL_ERROR();
    }
  }

  // Logging de l'erreur
  const logData = {
    error: {
      message: apiError.message,
      code: apiError.code,
      statusCode: apiError.statusCode,
      stack: apiError.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    }
  };

  if (apiError.statusCode >= 500) {
    logger.error('Erreur serveur:', logData);
  } else if (apiError.statusCode >= 400) {
    logger.warn('Erreur client:', logData);
  }

  // Réponse d'erreur
  const response = {
    error: apiError.message,
    code: apiError.code,
    timestamp: new Date().toISOString()
  };

  // Ajout des détails en développement
  if (process.env.NODE_ENV === 'development') {
    response.details = apiError.details;
    response.stack = apiError.stack;
  }

  // Ajout des détails de validation si présents
  if (apiError.details) {
    response.validation = apiError.details;
  }

  res.status(apiError.statusCode).json(response);
};

/**
 * Middleware pour les routes non trouvées
 */
const notFoundHandler = (req, res, next) => {
  const error = ErrorTypes.NOT_FOUND(`Route ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Wrapper pour les fonctions async
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  ErrorTypes,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  handleValidationError
};

