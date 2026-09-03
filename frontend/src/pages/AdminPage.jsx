import { useState, useEffect } from 'react';
import { getQueue, adminDecide, getAuditLog, getDocumentUrl } from '../api';
import OfficialStamp from '../components/OfficialStamp';

export default function AdminPage() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [queueRes, auditRes] = await Promise.all([getQueue(), getAuditLog()]);
      setQueue(queueRes.queue);
      setLogs(auditRes.logs);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDecide(identityId, action) {
    setDeciding(identityId);
    setError('');
    try {
      await adminDecide(identityId, action);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
    setDeciding(null);
  }

  if (loading) {
    return (
      <div className="page-container text-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container wide">
      <div className="page-header">
        <h1>Administration Panel</h1>
        <p className="subtitle">Review pending applications and audit verification activity.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'queue' ? 'active' : ''}`}
          onClick={() => setTab('queue')}
          id="tab-queue"
        >
          Pending Queue ({queue.length})
        </button>
        <button
          className={`tab ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
          id="tab-audit"
        >
          Audit Log ({logs.length})
        </button>
      </div>

      {/* ── Queue Tab ─────────────────────────────────────────── */}
      {tab === 'queue' && (
        <>
          {queue.length === 0 ? (
            <div className="text-center mt-4">
              <OfficialStamp status="verified" small />
              <p className="text-muted mt-2">No pending applications. All caught up!</p>
            </div>
          ) : (
            <div className="queue-table-wrapper">
              <table className="queue-table" id="admin-queue-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Applicant</th>
                    <th>Email</th>
                    <th>DOB</th>
                    <th>Document</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(item => (
                    <tr key={item.identity_id}>
                      <td className="mono" style={{ fontSize: '0.82rem' }}>#{item.identity_id}</td>
                      <td><strong>{item.name}</strong></td>
                      <td style={{ fontSize: '0.85rem' }}>{item.email}</td>
                      <td className="mono" style={{ fontSize: '0.82rem' }}>{item.date_of_birth || '—'}</td>
                      <td>
                        {item.document_id ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPreviewDoc(item)}
                            id={`view-doc-${item.identity_id}`}
                          >
                            {item.document_type} &#8599;
                          </button>
                        ) : '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '0.82rem' }}>
                        {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <div className="queue-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleDecide(item.identity_id, 'approve')}
                            disabled={deciding === item.identity_id}
                            id={`approve-${item.identity_id}`}
                          >
                            {deciding === item.identity_id ? '...' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDecide(item.identity_id, 'reject')}
                            disabled={deciding === item.identity_id}
                            id={`reject-${item.identity_id}`}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Audit Tab ─────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="audit-log">
          {logs.length === 0 ? (
            <p className="text-muted text-center mt-3">No audit entries yet.</p>
          ) : (
            logs.map(log => (
              <div className="audit-entry" key={log.log_id}>
                <span className="audit-timestamp">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}
                </span>
                <span className={`audit-action ${log.action}`}>{log.action}</span>
                <span>
                  Identity #{log.identity_id || '—'} &middot; {log.admin_name} &middot; {log.result}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Document Preview Modal ────────────────────────────── */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewDoc.document_type} — {previewDoc.name}</h3>
              <button className="modal-close" onClick={() => setPreviewDoc(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div>
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>APPLICANT</p>
                  <p><strong>{previewDoc.name}</strong></p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>EMAIL</p>
                  <p>{previewDoc.email}</p>
                </div>
              </div>
              <div className="form-row mt-2">
                <div>
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>DATE OF BIRTH</p>
                  <p className="mono">{previewDoc.date_of_birth || '—'}</p>
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>ADDRESS</p>
                  <p>{previewDoc.address || '—'}</p>
                </div>
              </div>
              {previewDoc.document_id && (
                <div className="mt-3">
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>DOCUMENT PREVIEW</p>
                  <iframe
                    src={getDocumentUrl(previewDoc.document_id)}
                    title="Document Preview"
                    style={{
                      width: '100%',
                      height: 360,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      background: '#fff',
                    }}
                  />
                </div>
              )}
              <div className="queue-actions mt-3" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { handleDecide(previewDoc.identity_id, 'approve'); setPreviewDoc(null); }}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => { handleDecide(previewDoc.identity_id, 'reject'); setPreviewDoc(null); }}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
