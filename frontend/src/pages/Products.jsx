import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState(product || { name: '', description: '', sku: '', category: '', unit_price: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (product) {
        await axios.put(`/api/products/${product.id}`, form)
      } else {
        await axios.post('/api/products', form)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{product ? 'Edit Product' : 'Add Product'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input className="form-control" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price</label>
                <input type="number" step="0.01" className="form-control" value={form.unit_price} onChange={e => setForm({...form, unit_price: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const canEdit = user?.role === 'admin' || user?.role === 'manufacturer'

  async function fetchProducts() {
    try {
      const res = await axios.get('/api/products')
      setProducts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    try {
      await axios.delete(`/api/products/${id}`)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="topbar">
        <h1>Products</h1>
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <input className="search-bar" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true) }}>+ Add Product</button>
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
                    <th>Name</th><th>SKU</th><th>Category</th>
                    <th>Unit Price</th><th>Stock</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="6"><div className="empty-state"><div className="empty-icon">📦</div><p>No products found</p></div></td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td><span className="badge badge-secondary">{p.sku}</span></td>
                      <td>{p.category || '-'}</td>
                      <td>${Number(p.unit_price).toFixed(2)}</td>
                      <td>
                        <span className={p.stock_quantity < 10 ? 'low-stock' : p.stock_quantity < 50 ? 'medium-stock' : 'good-stock'}>
                          {p.stock_quantity ?? 0}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex', gap:'6px'}}>
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(p); setShowModal(true) }}>Edit</button>
                          )}
                          {user?.role === 'admin' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                          )}
                        </div>
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
        <ProductModal
          product={editProduct}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchProducts() }}
        />
      )}
    </>
  )
}
