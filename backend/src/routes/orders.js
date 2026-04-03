const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

function generateOrderNumber() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// GET /api/orders
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  let orders;
  if (req.user.role === 'admin') {
    orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.sku,
             u.username as created_by_username,
             s.username as supplier_username
      FROM orders o
      JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users s ON o.supplier_id = s.id
      ORDER BY o.created_at DESC
    `).all();
  } else {
    orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.sku,
             u.username as created_by_username,
             s.username as supplier_username
      FROM orders o
      JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users s ON o.supplier_id = s.id
      WHERE o.created_by = ? OR o.supplier_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id, req.user.id);
  }
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, p.name as product_name, p.sku,
           u.username as created_by_username,
           s.username as supplier_username
    FROM orders o
    JOIN products p ON o.product_id = p.id
    LEFT JOIN users u ON o.created_by = u.id
    LEFT JOIN users s ON o.supplier_id = s.id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role !== 'admin' && order.created_by !== req.user.id && order.supplier_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(order);
});

// POST /api/orders
router.post('/', authenticate, (req, res) => {
  const { order_type, product_id, quantity, unit_price, supplier_id, notes } = req.body;
  if (!order_type || !product_id || quantity === undefined) {
    return res.status(400).json({ error: 'order_type, product_id and quantity required' });
  }
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const price = unit_price !== undefined ? unit_price : product.unit_price;
  const total = price * quantity;
  const id = uuidv4();
  const order_number = generateOrderNumber();

  db.prepare(`
    INSERT INTO orders (id, order_number, order_type, product_id, quantity, unit_price, total_amount, created_by, supplier_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, order_number, order_type, product_id, quantity, price, total, req.user.id, supplier_id || null, notes || null);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.status(201).json(order);
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status required' });
  }
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role !== 'admin' && order.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/orders/:id
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ message: 'Order deleted' });
});

module.exports = router;
