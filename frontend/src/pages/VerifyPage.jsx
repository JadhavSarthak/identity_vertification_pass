import { useState } from 'react';
import { verifyDID } from '../api';
import OfficialStamp from '../components/OfficialStamp';

export default function VerifyPage() {
  const [did, setDid] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!did.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await verifyDID(did.trim().toUpperCase());
      setResult(data);
    } catch {
      setResult({ found: false });
    }
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Verify a Digital Identity</h1>
        <p className="subtitle">
          Enter a Digital Identity ID to verify its authenticity.
          Only the holder&rsquo;s name and verification status will be shown.
        </p>
      </div>

      <form onSubmit={onSubmit} id="verify-form">
        <div className="verify-search">
          <input
            id="verify-input"
            type="text"
            value={did}
            onChange={e => setDid(e.target.value)}
            placeholder="DID-2026-XXXXXX"
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="verify-submit"
          >
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>
      </form>

      {/* Hint for demo */}
      {!searched && (
        <p className="text-center text-muted" style={{ fontSize: '0.82rem', marginTop: '-0.5rem' }}>
          Try: <button
            type="button"
            onClick={() => setDid('DID-2026-000042')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--seal-green)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.82rem',
              padding: 0,
            }}
            id="verify-demo-hint"
          >
            DID-2026-000042
          </button>
        </p>
      )}

      {/* ── Results ───────────────────────────────────────────── */}
      {searched && result && (
        <>
          {result.found ? (
            <div className="verify-result found" id="verify-result">
              <OfficialStamp status="verified" />
              <div className="verify-name">{result.name}</div>
              <div className="mt-1">
                <span className="status-badge verified">
                  <span className="status-dot verified" />
                  {result.status}
                </span>
              </div>
              {result.verified_at && (
                <div className="verify-date mt-1">
                  Verified on {new Date(result.verified_at).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              )}
              <p className="text-muted mt-2" style={{ fontSize: '0.82rem' }}>
                This Digital Identity has been verified by SecureID administration.
              </p>
            </div>
          ) : (
            <div className="verify-result not-found" id="verify-result">
              <OfficialStamp status="rejected" small />
              <h2 className="mt-2" style={{ color: 'var(--ink-muted)' }}>Not Verified</h2>
              <p className="text-muted mt-1" style={{ fontSize: '0.9rem' }}>
                The ID <span className="mono" style={{ fontWeight: 600 }}>{did.toUpperCase()}</span> does
                not correspond to a verified digital identity in our system.
              </p>
              <p className="text-muted mt-1" style={{ fontSize: '0.82rem' }}>
                This may mean the ID does not exist, is still pending, or was rejected.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
