import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon">SI</div>
          <span className="navbar-brand-text">SecureID</span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '\u2715' : '\u2630'}
        </button>

        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <NavLink to="/verify" onClick={() => setMenuOpen(false)}>
            Verify
          </NavLink>

          {!user && (
            <>
              <NavLink to="/register" onClick={() => setMenuOpen(false)}>
                Register
              </NavLink>
              <NavLink to="/login" onClick={() => setMenuOpen(false)}>
                Sign In
              </NavLink>
            </>
          )}

          {user && user.role === 'user' && (
            <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>
              Dashboard
            </NavLink>
          )}

          {user && user.role === 'admin' && (
            <NavLink to="/admin" onClick={() => setMenuOpen(false)}>
              Admin Panel
            </NavLink>
          )}

          {user && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', padding: '0 0.4rem' }}>
                {user.name}
                <span className={`role-badge ${user.role}`}>{user.role}</span>
              </span>
              <button onClick={handleLogout}>Sign Out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
