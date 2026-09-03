import { useAuth } from '../context/AuthContext';
import OfficialStamp from '../components/OfficialStamp';
import { getQRCodeDataUrl } from '../utils/qrCode';

export default function DashboardPage() {
  const { user, identity, document: doc, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container text-center">
        <div className="spinner" />
      </div>
    );
  }

  const status = identity?.verification_status || 'pending';
  const qrUrl = identity?.did ? getQRCodeDataUrl(identity.did, 120) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Identity Dashboard</h1>
        <p className="subtitle">Your personal verification status and credentials.</p>
      </div>

      {/* ── Certificate Card ─────────────────────────────────────── */}
      <div className="certificate">
        <div className="certificate-header">
          <h2>Digital Identity Certificate</h2>
          <h1>{user?.name}</h1>
        </div>

        {identity?.did && (
          <div className="text-center mb-3">
            <div className="did-display large">{identity.did}</div>
          </div>
        )}

        <div className="certificate-body">
          <div className="certificate-details">
            <div className="certificate-field">
              <div className="label">Status</div>
              <div className="value">
                <span className={`status-badge ${status}`}>
                  <span className={`status-dot ${status}`} />
                  {status}
                </span>
              </div>
            </div>

            <div className="certificate-field">
              <div className="label">Email</div>
              <div className="value">{user?.email}</div>
            </div>

            {user?.phone && (
              <div className="certificate-field">
                <div className="label">Phone</div>
                <div className="value">{user.phone}</div>
              </div>
            )}

            {identity?.date_of_birth && (
              <div className="certificate-field">
                <div className="label">Date of Birth</div>
                <div className="value">{identity.date_of_birth}</div>
              </div>
            )}

            {identity?.address && (
              <div className="certificate-field">
                <div className="label">Address</div>
                <div className="value">{identity.address}</div>
              </div>
            )}

            {doc && (
              <div className="certificate-field">
                <div className="label">Document Type</div>
                <div className="value">{doc.document_type}</div>
              </div>
            )}

            {identity?.submitted_at && (
              <div className="certificate-field">
                <div className="label">Submitted</div>
                <div className="value mono" style={{ fontSize: '0.88rem' }}>
                  {new Date(identity.submitted_at).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              </div>
            )}

            {identity?.verified_at && (
              <div className="certificate-field">
                <div className="label">{status === 'verified' ? 'Verified On' : 'Decided On'}</div>
                <div className="value mono" style={{ fontSize: '0.88rem' }}>
                  {new Date(identity.verified_at).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="certificate-stamp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <OfficialStamp status={status} />
            {qrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={qrUrl} alt="DID Verification QR Code" style={{ borderRadius: '6px', border: '1px solid var(--border)', padding: '4px', background: '#fff' }} />
                <p className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: '4px' }}>SCAN TO VERIFY</p>
              </div>
            )}
          </div>
        </div>

        <hr className="certificate-divider" />

        <div className="flex-between align-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0, flex: 1 }}>
            {status === 'verified'
              ? 'This credential is digitally verified and can be looked up via the public Verify Portal.'
              : status === 'pending'
              ? 'Your application is currently under review by an administrator.'
              : 'Your application was not approved. Please contact support for further assistance.'}
          </p>

          {status === 'verified' && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => window.print()}
              style={{ flexShrink: 0 }}
            >
              &#128438; Print / Download Credential
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

