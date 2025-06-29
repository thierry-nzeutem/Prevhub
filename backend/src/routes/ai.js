/**
 * Routes d'intégration IA avec OLLAMA
 * Auteur: Manus AI
 */

const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const OLLAMA_BASE_URL = `http://${process.env.OLLAMA_HOST || 'localhost'}:${process.env.OLLAMA_PORT || 11434}`;

// Analyser un document avec IA
router.post('/analyze-document', [
  body('document_id').isUUID(),
  body('analysis_type').isIn(['NOTICE_REVIEW', 'DOCUMENT_CLASSIFICATION', 'CONTENT_EXTRACTION'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { document_id, analysis_type } = req.body;

  // Récupération du document
  const docResult = await query(
    'SELECT * FROM documents WHERE id = $1',
    [document_id]
  );

  if (docResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Document');
  }

  const document = docResult.rows[0];

  try {
    // Préparation du prompt selon le type d'analyse
    let prompt = '';
    let model = 'mistral:7b';

    switch (analysis_type) {
      case 'NOTICE_REVIEW':
        model = 'llama3.1:70b';
        prompt = `Analysez cette notice de sécurité incendie et identifiez les points critiques, 
                 les non-conformités potentielles et les recommandations d'amélioration.
                 Document: ${document.original_name}`;
        break;
      case 'DOCUMENT_CLASSIFICATION':
        prompt = `Classifiez ce document selon les catégories: NOTICE, PLAN, RAPPORT, DEVIS, FACTURE.
                 Nom du fichier: ${document.original_name}`;
        break;
      case 'CONTENT_EXTRACTION':
        prompt = `Extrayez les informations clés de ce document (dates, montants, références, contacts).
                 Document: ${document.original_name}`;
        break;
    }

    // Appel à OLLAMA
    const startTime = Date.now();
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model,
      prompt,
      stream: false
    }, {
      timeout: 120000 // 2 minutes
    });

    const processingTime = Date.now() - startTime;
    const result = response.data.response;

    // Sauvegarde de l'analyse
    const analysisResult = await query(
      `INSERT INTO ai_analyses (document_id, analysis_type, model_used, input_data, 
                               result, processing_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        document_id,
        analysis_type,
        model,
        JSON.stringify({ prompt }),
        JSON.stringify({ analysis: result }),
        processingTime,
        'COMPLETED'
      ]
    );

    // Mise à jour du statut du document
    await query(
      `UPDATE documents 
       SET ai_analysis_status = 'COMPLETED', ai_analysis_result = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify({ analysis: result }), document_id]
    );

    logger.info('Analyse IA terminée', {
      documentId: document_id,
      analysisType: analysis_type,
      model,
      processingTime
    });

    res.json({
      message: 'Analyse IA terminée avec succès',
      analysis: analysisResult.rows[0],
      result
    });

  } catch (error) {
    logger.error('Erreur analyse IA:', error);

    // Sauvegarde de l'erreur
    await query(
      `INSERT INTO ai_analyses (document_id, analysis_type, model_used, status, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [document_id, analysis_type, model || 'mistral:7b', 'FAILED', error.message]
    );

    await query(
      `UPDATE documents 
       SET ai_analysis_status = 'FAILED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [document_id]
    );

    throw ErrorTypes.INTERNAL_ERROR('Erreur lors de l\'analyse IA');
  }
}));

// Chat avec l'IA
router.post('/chat', [
  body('message').trim().isLength({ min: 1, max: 1000 }),
  body('context').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { message, context } = req.body;

  try {
    const prompt = context ? 
      `Contexte: ${context}\n\nQuestion: ${message}` : 
      message;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'mistral:7b',
      prompt,
      stream: false
    }, {
      timeout: 60000
    });

    res.json({
      response: response.data.response,
      model: 'mistral:7b'
    });

  } catch (error) {
    logger.error('Erreur chat IA:', error);
    throw ErrorTypes.INTERNAL_ERROR('Service IA temporairement indisponible');
  }
}));

// Statut des modèles OLLAMA
router.get('/models', asyncHandler(async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    res.json({
      models: response.data.models || [],
      status: 'available'
    });
  } catch (error) {
    res.json({
      models: [],
      status: 'unavailable',
      error: error.message
    });
  }
}));

module.exports = router;

