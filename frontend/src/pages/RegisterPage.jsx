import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api';

const DOC_TYPES = ['College ID', 'Passport', 'Driving Licence', 'Aadhaar (Demo)'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    date_of_birth: '', address: '', document_type: DOC_TYPES[0],
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('document', file);

      const data = await register(fd);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // ── Confirmation Screen ──────────────────────────────────────
  if (result) {
    return (
      <div className="page-container">
        <div className="card confirmation">
          <div className="confirmation-icon">&#10003;</div>
          <h2>Application Submitted</h2>
          <p className="text-muted mt-1">
            Your identity verification request has been received and is awaiting admin review.
          </p>
          <div className="ref-number">{result.reference_number}</div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Save this reference number for your records.
          </p>
          <div className="mt-3">
            <Link to="/login" className="btn btn-primary">Sign In to Track Status</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Register for Verification</h1>
        <p className="subtitle">
          Submit your personal details and identity document for review.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 580, margin: '0 auto' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit} id="register-form">
          <div className="form-group">
            <label htmlFor="reg-name">Full Name *</label>
            <input
              id="reg-name"
              name="name"
              value={form.name}
              onChange={onChange}
              required
              placeholder="As it appears on your document"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-email">Email Address *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-phone">Phone Number</label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={onChange}
                placeholder="+91-XXXXXXXXXX"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password *</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-dob">Date of Birth</label>
              <input
                id="reg-dob"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={onChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-doctype">Document Type *</label>
              <select
                id="reg-doctype"
                name="document_type"
                value={form.document_type}
                onChange={onChange}
              >
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-address">Address</label>
            <input
              id="reg-address"
              name="address"
              value={form.address}
              onChange={onChange}
              placeholder="Street, City, PIN"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-file">Identity Document (PNG, JPG, PDF, max 5 MB) *</label>
            <input
              id="reg-file"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.webp"
              onChange={e => setFile(e.target.files[0])}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block mt-2"
            disabled={loading}
            id="register-submit"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <p className="text-center text-muted mt-2" style={{ fontSize: '0.85rem' }}>
          Already registered? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
