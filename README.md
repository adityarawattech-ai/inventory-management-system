# Inventory Management System

A web-based inventory management system built to streamline interactions between manufacturers and suppliers.

## Features

- **RESTful API** built with Node.js and Express
- **Relational database** using SQLite for products, stock, and transaction data
- **JWT authentication** with role-based access control (Admin, Manufacturer, Supplier)
- **Responsive React frontend** for managing inventory and tracking transactions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| Frontend | React 18, Vite |
| HTTP Client | Axios |

## Project Structure

```
inventory-management-system/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js      # SQLite schema & connection
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification & role guards
│   │   └── routes/
│   │       ├── auth.js          # /api/auth (register, login, me)
│   │       ├── products.js      # /api/products (CRUD)
│   │       ├── stock.js         # /api/stock (view & update)
│   │       ├── transactions.js  # /api/transactions (CRUD)
│   │       └── orders.js        # /api/orders (CRUD + status)
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── PrivateRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Products.jsx
    │   │   ├── Stock.jsx
    │   │   ├── Transactions.jsx
    │   │   └── Orders.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Database Schema

- **users** — id, username, email, password_hash, role (`admin` | `manufacturer` | `supplier`), created_at
- **products** — id, name, description, sku, category, unit_price, created_by, created_at, updated_at
- **stock** — id, product_id, quantity, warehouse_location, last_updated, updated_by
- **transactions** — id, product_id, transaction_type (`purchase` | `sale` | `adjustment` | `transfer`), quantity, unit_price, total_amount, performed_by, notes, created_at
- **orders** — id, order_number, order_type (`purchase_order` | `sales_order`), product_id, quantity, unit_price, total_amount, status (`pending` | `confirmed` | `shipped` | `delivered` | `cancelled`), created_by, supplier_id, notes, created_at, updated_at

## API Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Get current user | Any |
| GET | `/api/products` | List products | Any |
| POST | `/api/products` | Create product | Admin, Manufacturer |
| PUT | `/api/products/:id` | Update product | Admin, Manufacturer |
| DELETE | `/api/products/:id` | Delete product | Admin |
| GET | `/api/stock` | List stock levels | Any |
| PUT | `/api/stock/:product_id` | Update stock | Admin, Manufacturer |
| GET | `/api/transactions` | List transactions | Any |
| POST | `/api/transactions` | Create transaction | Admin, Manufacturer |
| GET | `/api/orders` | List orders | Any |
| POST | `/api/orders` | Create order | Any |
| PUT | `/api/orders/:id/status` | Update order status | Admin |
| DELETE | `/api/orders/:id` | Delete order | Admin |

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
npm install
npm start
```

The API will be available at `http://localhost:5000`.

A default admin account is created on first startup:
- **Username:** `admin`
- **Password:** `Admin@123`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (proxied to the backend API).

### Production Build

```bash
cd frontend
npm run build
# Serve the dist/ folder with any static file server
```

## Roles & Permissions

| Action | Admin | Manufacturer | Supplier |
|--------|-------|-------------|---------|
| View products | ✅ | ✅ | ✅ |
| Create/edit products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ❌ | ❌ |
| View stock | ✅ | ✅ | ✅ |
| Update stock | ✅ | ✅ | ❌ |
| View transactions | ✅ | ✅ | ✅ |
| Create transactions | ✅ | ✅ | ❌ |
| View orders | ✅ | ✅ | ✅ |
| Create orders | ✅ | ✅ | ✅ |
| Update order status | ✅ | ❌ | ❌ |
