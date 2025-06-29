/**
 * Routes de gestion des devis
 * Auteur: Manus AI
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Liste des devis
router.get('/', requireRole(['admin', 'manager', 'commercial']), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT q.*, 
           p.name as project_name,
           o.name as organization_name,
           COUNT(ql.id) as lines_count
    FROM quotes q
    LEFT JOIN projects p ON q.project_id = p.id
    LEFT JOIN organizations o ON q.organization_id = o.id
    LEFT JOIN quote_lines ql ON q.id = ql.quote_id
    GROUP BY q.id, p.name, o.name
    ORDER BY q.created_at DESC
  `);

  res.json({ quotes: result.rows });
}));

// Créer un devis
router.post('/', [
  requireRole(['admin', 'manager', 'commercial']),
  body('project_id').isUUID(),
  body('organization_id').isUUID(),
  body('lines').isArray({ min: 1 }),
  body('lines.*.description').trim().isLength({ min: 1 }),
  body('lines.*.quantity').isFloat({ min: 0 }),
  body('lines.*.unit_price').isFloat({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorTypes.VALIDATION_ERROR('Données invalides', errors.array());
  }

  const { project_id, organization_id, lines, valid_until } = req.body;

  // Génération du numéro de devis
  const quoteNumber = `DEV-${Date.now()}`;

  // Calcul du montant total
  const totalAmount = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
  const taxAmount = totalAmount * 0.20; // TVA 20%

  const result = await transaction(async (client) => {
    // Création du devis
    const quoteResult = await client.query(
      `INSERT INTO quotes (project_id, organization_id, quote_number, total_amount, tax_amount, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [project_id, organization_id, quoteNumber, totalAmount, taxAmount, valid_until]
    );

    const quote = quoteResult.rows[0];

    // Création des lignes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await client.query(
        `INSERT INTO quote_lines (quote_id, description, quantity, unit_price, total_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [quote.id, line.description, line.quantity, line.unit_price, line.quantity * line.unit_price, i]
      );
    }

    return quote;
  });

  res.status(201).json({
    message: 'Devis créé avec succès',
    quote: result
  });
}));

// Détails d'un devis
router.get('/:id', requireRole(['admin', 'manager', 'commercial']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quoteResult = await query(`
    SELECT q.*, 
           p.name as project_name,
           o.name as organization_name, o.address, o.city, o.postal_code
    FROM quotes q
    LEFT JOIN projects p ON q.project_id = p.id
    LEFT JOIN organizations o ON q.organization_id = o.id
    WHERE q.id = $1
  `, [id]);

  if (quoteResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Devis');
  }

  const linesResult = await query(
    'SELECT * FROM quote_lines WHERE quote_id = $1 ORDER BY sort_order',
    [id]
  );

  const quote = quoteResult.rows[0];
  quote.lines = linesResult.rows;

  res.json(quote);
}));

module.exports = router;

