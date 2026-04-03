const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/stock
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const stock = db.prepare(`
    SELECT s.*, p.name as product_name, p.sku, p.category, p.unit_price,
           u.username as updated_by_username
    FROM stock s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN users u ON s.updated_by = u.id
    ORDER BY p.name ASC
  `).all();
  res.json(stock);
});

// GET /api/stock/:product_id
router.get('/:product_id', authenticate, (req, res) => {
  const db = getDb();
  const stock = db.prepare(`
    SELECT s.*, p.name as product_name, p.sku, p.category, p.unit_price,
           u.username as updated_by_username
    FROM stock s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN users u ON s.updated_by = u.id
    WHERE s.product_id = ?
  `).get(req.params.product_id);
  if (!stock) return res.status(404).json({ error: 'Stock not found' });
  res.json(stock);
});

// PUT /api/stock/:product_id
router.put('/:product_id', authenticate, requireRole('admin', 'manufacturer'), (req, res) => {
  const { quantity, warehouse_location } = req.body;
  if (quantity === undefined) return res.status(400).json({ error: 'Quantity required' });

  const db = getDb();
  const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(req.params.product_id);
  if (!stock) return res.status(404).json({ error: 'Stock record not found' });

  db.prepare(`
    UPDATE stock SET
      quantity = ?, warehouse_location = ?,
      last_updated = datetime('now'), updated_by = ?
    WHERE product_id = ?
  `).run(
    quantity,
    warehouse_location !== undefined ? warehouse_location : stock.warehouse_location,
    req.user.id,
    req.params.product_id
  );

  const updated = db.prepare(`
    SELECT s.*, p.name as product_name, p.sku
    FROM stock s JOIN products p ON s.product_id = p.id
    WHERE s.product_id = ?
  `).get(req.params.product_id);
  res.json(updated);
});

module.exports = router;
