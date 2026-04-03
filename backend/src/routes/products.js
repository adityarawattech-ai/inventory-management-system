const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/products
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const products = db.prepare(`
    SELECT p.*, u.username as created_by_username,
           s.quantity as stock_quantity
    FROM products p
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN stock s ON s.product_id = p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, u.username as created_by_username,
           s.quantity as stock_quantity, s.warehouse_location
    FROM products p
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN stock s ON s.product_id = p.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/products
router.post('/', authenticate, requireRole('admin', 'manufacturer'), (req, res) => {
  const { name, description, sku, category, unit_price } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
  if (existing) return res.status(409).json({ error: 'SKU already exists' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO products (id, name, description, sku, category, unit_price, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || null, sku, category || null, unit_price || 0, req.user.id);

  // Create initial stock record
  const stockId = uuidv4();
  db.prepare(`
    INSERT INTO stock (id, product_id, quantity, warehouse_location, updated_by)
    VALUES (?, ?, 0, NULL, ?)
  `).run(stockId, id, req.user.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireRole('admin', 'manufacturer'), (req, res) => {
  const { name, description, sku, category, unit_price } = req.body;
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (sku && sku !== product.sku) {
    const existing = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, req.params.id);
    if (existing) return res.status(409).json({ error: 'SKU already exists' });
  }

  db.prepare(`
    UPDATE products SET
      name = ?, description = ?, sku = ?, category = ?, unit_price = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || product.name,
    description !== undefined ? description : product.description,
    sku || product.sku,
    category !== undefined ? category : product.category,
    unit_price !== undefined ? unit_price : product.unit_price,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  db.prepare('DELETE FROM stock WHERE product_id = ?').run(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

module.exports = router;
