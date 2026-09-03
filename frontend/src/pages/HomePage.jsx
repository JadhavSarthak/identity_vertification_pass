import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <section className="hero">
        <h1>Digital Identity Verification</h1>
        <p className="subtitle">
          A secure, government-grade system for issuing, managing, and publicly
          verifying digital identity credentials. Built with encryption at rest,
          audit logging, and role-based access control.
        </p>
        <div className="hero-actions">
          {!user && (
            <>
              <Link to="/register" className="btn btn-primary" id="hero-register-btn">
                Register Identity
              </Link>
              <Link to="/login" className="btn btn-outline" id="hero-login-btn">
                Sign In
              </Link>
            </>
          )}
          {user && user.role === 'user' && (
            <Link to="/dashboard" className="btn btn-primary" id="hero-dashboard-btn">
              My Dashboard
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" className="btn btn-primary" id="hero-admin-btn">
              Admin Panel
            </Link>
          )}
          <Link to="/verify" className="btn btn-outline" id="hero-verify-btn">
            Verify a DID
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon">&#128274;</div>
          <h3>Encrypted Storage</h3>
          <p>
            Sensitive personal data is AES-encrypted at rest. Only authorised
            users and administrators can decrypt and view protected fields.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">&#128203;</div>
          <h3>Manual Verification</h3>
          <p>
            Every identity application is reviewed by an administrator.
            No automated approvals &mdash; ensuring human oversight and accountability.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">&#128270;</div>
          <h3>Public Verify Portal</h3>
          <p>
            Anyone can verify a Digital Identity ID. The portal reveals only the
            holder&rsquo;s name and status &mdash; never personal details or documents.
          </p>
        </div>
      </section>
    </>
  );
}
