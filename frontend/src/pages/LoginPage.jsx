import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@secureid.gov', password: 'Admin@12345' },
  { label: 'John (Pending)', email: 'john.doe@example.com', password: 'User@12345' },
  { label: 'Alice (Verified)', email: 'alice.smith@example.com', password: 'User@12345' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      loginSuccess(data.token, data.user);
      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="page-header">
          <h1>Sign In</h1>
          <p className="subtitle">Access your identity dashboard or admin panel.</p>
        </div>

        <div className="card">
          <p className="text-muted mb-2" style={{ fontSize: '0.82rem' }}>Quick fill (demo accounts):</p>
          <div className="demo-chips">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                className="demo-chip"
                onClick={() => fillDemo(acc)}
                id={`demo-chip-${acc.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
              >
                {acc.label}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={onSubmit} id="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block mt-2"
              disabled={loading}
              id="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-muted mt-2" style={{ fontSize: '0.85rem' }}>
            Don&rsquo;t have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
