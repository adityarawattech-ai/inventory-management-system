const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/transactions
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const transactions = db.prepare(`
    SELECT t.*, p.name as product_name, p.sku,
           u.username as performed_by_username
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    LEFT JOIN users u ON t.performed_by = u.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(transactions);
});

// GET /api/transactions/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const transaction = db.prepare(`
    SELECT t.*, p.name as product_name, p.sku,
           u.username as performed_by_username
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    LEFT JOIN users u ON t.performed_by = u.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
  res.json(transaction);
});

// POST /api/transactions
router.post('/', authenticate, requireRole('admin', 'manufacturer'), (req, res) => {
  const { product_id, transaction_type, quantity, unit_price, notes } = req.body;
  if (!product_id || !transaction_type || quantity === undefined) {
    return res.status(400).json({ error: 'product_id, transaction_type and quantity required' });
  }
  const validTypes = ['purchase', 'sale', 'adjustment', 'transfer'];
  if (!validTypes.includes(transaction_type)) {
    return res.status(400).json({ error: 'Invalid transaction_type' });
  }

  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const price = unit_price !== undefined ? unit_price : product.unit_price;
  const total = price * quantity;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO transactions (id, product_id, transaction_type, quantity, unit_price, total_amount, performed_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, product_id, transaction_type, quantity, price, total, req.user.id, notes || null);

  // Update stock based on transaction type
  const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(product_id);
  if (stock) {
    let newQty = stock.quantity;
    if (transaction_type === 'purchase') newQty += quantity;
    else if (transaction_type === 'sale') newQty -= quantity;
    else if (transaction_type === 'adjustment') newQty = quantity;
    db.prepare(`
      UPDATE stock SET quantity = ?, last_updated = datetime('now'), updated_by = ?
      WHERE product_id = ?
    `).run(newQty, req.user.id, product_id);
  }

  const transaction = db.prepare(`
    SELECT t.*, p.name as product_name, u.username as performed_by_username
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    LEFT JOIN users u ON t.performed_by = u.id
    WHERE t.id = ?
  `).get(id);
  res.status(201).json(transaction);
});

module.exports = router;
