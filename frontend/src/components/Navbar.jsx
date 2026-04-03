import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/products', label: 'Products', icon: '📦' },
  { path: '/stock', label: 'Stock', icon: '🏭' },
  { path: '/transactions', label: 'Transactions', icon: '💱' },
  { path: '/orders', label: 'Orders', icon: '📋' },
]

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Inventory</h2>
        <span>Management System</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        {user && (
          <div className="user-info">
            <div className="username">{user.username}</div>
            <span className="role-badge">{user.role}</span>
          </div>
        )}
        <button className="logout-btn" onClick={logout}>Sign Out</button>
      </div>
    </aside>
  )
}
