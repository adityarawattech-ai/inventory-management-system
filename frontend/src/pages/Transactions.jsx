import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function TransactionModal({ products, onClose, onSaved }) {
  const [form, setForm] = useState({ product_id: '', transaction_type: 'purchase', quantity: '', unit_price: '', notes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/transactions', { ...form, quantity: Number(form.quantity), unit_price: form.unit_price ? Number(form.unit_price) : undefined })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>New Transaction</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-control" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Transaction Type *</label>
              <select className="form-control" value={form.transaction_type} onChange={e => setForm({...form, transaction_type: e.target.value})}>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="adjustment">Adjustment</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input type="number" className="form-control" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price</label>
                <input type="number" step="0.01" className="form-control" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TYPE_BADGE = { purchase: 'success', sale: 'danger', adjustment: 'warning', transfer: 'primary' }

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')
  const canCreate = user?.role === 'admin' || user?.role === 'manufacturer'

  async function fetchAll() {
    try {
      const [tx, prod] = await Promise.all([axios.get('/api/transactions'), axios.get('/api/products')])
      setTransactions(tx.data)
      setProducts(prod.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = transactions.filter(t =>
    !filter || t.transaction_type === filter
  )

  return (
    <>
      <div className="topbar">
        <h1>Transactions</h1>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <select className="form-control" style={{width:'160px'}} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="adjustment">Adjustment</option>
            <option value="transfer">Transfer</option>
          </select>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Transaction</button>
          )}
        </div>
      </div>
      <div className="page-content">
        <div className="card">
          {loading ? <div className="loading">Loading...</div> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th><th>Type</th><th>Qty</th>
                    <th>Unit Price</th><th>Total</th><th>By</th>
                    <th>Notes</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="8"><div className="empty-state"><div className="empty-icon">💱</div><p>No transactions</p></div></td></tr>
                  ) : filtered.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.product_name}</strong></td>
                      <td><span className={`badge badge-${TYPE_BADGE[t.transaction_type]}`}>{t.transaction_type}</span></td>
                      <td>{t.quantity}</td>
                      <td>${Number(t.unit_price).toFixed(2)}</td>
                      <td>${Number(t.total_amount).toFixed(2)}</td>
                      <td>{t.performed_by_username}</td>
                      <td style={{fontSize:'12px', color:'var(--text-secondary)', maxWidth:'150px'}}>{t.notes || '-'}</td>
                      <td style={{fontSize:'12px', color:'var(--text-secondary)'}}>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <TransactionModal
          products={products}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </>
  )
}
