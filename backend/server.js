require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./src/db/database');

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const stockRoutes = require('./src/routes/stock');
const transactionRoutes = require('./src/routes/transactions');
const orderRoutes = require('./src/routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize DB on startup
getDb();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
