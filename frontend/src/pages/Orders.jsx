import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function OrderModal({ products, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({ order_type: 'purchase_order', product_id: '', quantity: '', unit_price: '', supplier_id: '', notes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/orders', {
        ...form,
        quantity: Number(form.quantity),
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        supplier_id: form.supplier_id || undefined,
      })
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
          <h3>Create Order</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Order Type *</label>
              <select className="form-control" value={form.order_type} onChange={e => setForm({...form, order_type: e.target.value})}>
                <option value="purchase_order">Purchase Order</option>
                <option value="sales_order">Sales Order</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-control" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
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
              <label className="form-label">Supplier</label>
              <select className="form-control" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_BADGE = { pending: 'warning', confirmed: 'primary', shipped: 'secondary', delivered: 'success', cancelled: 'danger' }

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  async function fetchAll() {
    try {
      const [ordRes, prodRes] = await Promise.all([
        axios.get('/api/orders'),
        axios.get('/api/products'),
      ])
      setOrders(ordRes.data)
      setProducts(prodRes.data)
      // Get suppliers from orders' supplier usernames
      const unique = []
      const seen = new Set()
      ordRes.data.forEach(o => {
        if (o.supplier_id && !seen.has(o.supplier_id)) {
          seen.add(o.supplier_id)
          unique.push({ id: o.supplier_id, username: o.supplier_username })
        }
      })
      setSuppliers(unique)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function updateStatus(id, status) {
    try {
      await axios.put(`/api/orders/${id}/status`, { status })
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed')
    }
  }

  async function deleteOrder(id) {
    if (!confirm('Delete this order?')) return
    try {
      await axios.delete(`/api/orders/${id}`)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed')
    }
  }

  const filtered = orders.filter(o => !statusFilter || o.status === statusFilter)

  return (
    <>
      <div className="topbar">
        <h1>Orders</h1>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <select className="form-control" style={{width:'160px'}} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Order</button>
        </div>
      </div>
      <div className="page-content">
        <div className="card">
          {loading ? <div className="loading">Loading...</div> : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th><th>Type</th><th>Product</th>
                    <th>Qty</th><th>Total</th><th>Status</th>
                    <th>Update Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="8"><div className="empty-state"><div className="empty-icon">📋</div><p>No orders</p></div></td></tr>
                  ) : filtered.map(o => (
                    <tr key={o.id}>
                      <td style={{fontSize:'12px'}}>{o.order_number}</td>
                      <td><span className="badge badge-primary">{o.order_type === 'purchase_order' ? 'PO' : 'SO'}</span></td>
                      <td>{o.product_name}</td>
                      <td>{o.quantity}</td>
                      <td>${Number(o.total_amount).toFixed(2)}</td>
                      <td><span className={`badge badge-${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                      <td>
                        {o.status !== 'delivered' && o.status !== 'cancelled' && (
                          <select className="form-control" style={{fontSize:'12px', padding:'3px 6px'}}
                            value={o.status}
                            onChange={e => updateStatus(o.id, e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {user?.role === 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => deleteOrder(o.id)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <OrderModal
          products={products}
          suppliers={suppliers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </>
  )
}
