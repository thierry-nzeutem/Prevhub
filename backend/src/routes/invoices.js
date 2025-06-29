/**
 * Routes de gestion des factures
 * Auteur: Manus AI
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { ErrorTypes, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Liste des factures
router.get('/', requireRole(['admin', 'manager', 'commercial']), asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT i.*, 
           p.name as project_name,
           o.name as organization_name
    FROM invoices i
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN organizations o ON i.organization_id = o.id
    ORDER BY i.created_at DESC
  `);

  res.json({ invoices: result.rows });
}));

// Créer une facture depuis un devis
router.post('/from-quote/:quoteId', [
  requireRole(['admin', 'manager', 'commercial'])
], asyncHandler(async (req, res) => {
  const { quoteId } = req.params;

  // Récupération du devis
  const quoteResult = await query(
    'SELECT * FROM quotes WHERE id = $1 AND status = $2',
    [quoteId, 'ACCEPTED']
  );

  if (quoteResult.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Devis accepté');
  }

  const quote = quoteResult.rows[0];
  const invoiceNumber = `FACT-${Date.now()}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // Échéance à 30 jours

  const result = await query(
    `INSERT INTO invoices (project_id, organization_id, quote_id, invoice_number, 
                          total_amount, tax_amount, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      quote.project_id,
      quote.organization_id,
      quote.id,
      invoiceNumber,
      quote.total_amount,
      quote.tax_amount,
      dueDate.toISOString().split('T')[0]
    ]
  );

  res.status(201).json({
    message: 'Facture créée avec succès',
    invoice: result.rows[0]
  });
}));

// Marquer une facture comme payée
router.patch('/:id/paid', requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE invoices 
     SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    throw ErrorTypes.NOT_FOUND('Facture');
  }

  res.json({
    message: 'Facture marquée comme payée',
    invoice: result.rows[0]
  });
}));

module.exports = router;

