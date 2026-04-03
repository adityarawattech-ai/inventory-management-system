import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ products: 0, lowStock: 0, transactions: 0, pendingOrders: 0 })
  const [recentTx, setRecentTx] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [products, stock, transactions, orders] = await Promise.all([
          axios.get('/api/products'),
          axios.get('/api/stock'),
          axios.get('/api/transactions'),
          axios.get('/api/orders'),
        ])
        setStats({
          products: products.data.length,
          lowStock: stock.data.filter(s => s.quantity < 10).length,
          transactions: transactions.data.length,
          pendingOrders: orders.data.filter(o => o.status === 'pending').length,
        })
        setRecentTx(transactions.data.slice(0, 5))
        setRecentOrders(orders.data.slice(0, 5))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <>
      <div className="topbar">
        <h1>Dashboard</h1>
        <span style={{fontSize:'14px', color:'var(--text-secondary)'}}>
          Welcome back, <strong>{user?.username}</strong>
        </span>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📦</div>
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{stats.products}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">⚠️</div>
            <div className="stat-label">Low Stock Items</div>
            <div className="stat-value">{stats.lowStock}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">💱</div>
            <div className="stat-label">Total Transactions</div>
            <div className="stat-value">{stats.transactions}</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">📋</div>
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{stats.pendingOrders}</div>
          </div>
        </div>

        <div className="grid-2" style={{gap:'20px'}}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Transactions</span>
            </div>
            {recentTx.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💱</div><p>No transactions yet</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Product</th><th>Type</th><th>Qty</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {recentTx.map(t => (
                      <tr key={t.id}>
                        <td>{t.product_name}</td>
                        <td><span className={`badge badge-${t.transaction_type === 'sale' ? 'danger' : 'success'}`}>{t.transaction_type}</span></td>
                        <td>{t.quantity}</td>
                        <td style={{fontSize:'12px', color:'var(--text-secondary)'}}>{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Orders</span>
            </div>
            {recentOrders.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p>No orders yet</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Order #</th><th>Product</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{fontSize:'12px'}}>{o.order_number}</td>
                        <td>{o.product_name}</td>
                        <td><span className={`badge badge-${o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
