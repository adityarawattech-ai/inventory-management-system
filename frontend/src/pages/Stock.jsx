import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function StockModal({ stock, onClose, onSaved }) {
  const [form, setForm] = useState({ quantity: stock.quantity, warehouse_location: stock.warehouse_location || '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.put(`/api/stock/${stock.product_id}`, form)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Update Stock: {stock.product_name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input type="number" className="form-control" value={form.quantity}
                onChange={e => setForm({...form, quantity: Number(e.target.value)})} required min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Location</label>
              <input className="form-control" value={form.warehouse_location}
                onChange={e => setForm({...form, warehouse_location: e.target.value})}
                placeholder="e.g. Aisle A, Shelf 3" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Stock() {
  const { user } = useAuth()
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editStock, setEditStock] = useState(null)
  const canEdit = user?.role === 'admin' || user?.role === 'manufacturer'

  async function fetchStock() {
    try {
      const res = await axios.get('/api/stock')
      setStock(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStock() }, [])

  function getStockClass(qty) {
    if (qty < 10) return 'badge badge-danger'
    if (qty < 50) return 'badge badge-warning'
    return 'badge badge-success'
  }

  const filtered = stock.filter(s =>
    s.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.warehouse_location || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="topbar">
        <h1>Stock Levels</h1>
        <input className="search-bar" placeholder="Search stock..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="page-content">
        <div className="card">
          {loading ? <div className="loading">Loading...</div> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th><th>SKU</th><th>Category</th>
                    <th>Quantity</th><th>Location</th><th>Last Updated</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="7"><div className="empty-state"><div className="empty-icon">🏭</div><p>No stock records</p></div></td></tr>
                  ) : filtered.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.product_name}</strong></td>
                      <td><span className="badge badge-secondary">{s.sku}</span></td>
                      <td>{s.category || '-'}</td>
                      <td><span className={getStockClass(s.quantity)}>{s.quantity}</span></td>
                      <td>{s.warehouse_location || '-'}</td>
                      <td style={{fontSize:'12px', color:'var(--text-secondary)'}}>{new Date(s.last_updated).toLocaleDateString()}</td>
                      {canEdit && (
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditStock(s)}>Update</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editStock && (
        <StockModal
          stock={editStock}
          onClose={() => setEditStock(null)}
          onSaved={() => { setEditStock(null); fetchStock() }}
        />
      )}
    </>
  )
}
