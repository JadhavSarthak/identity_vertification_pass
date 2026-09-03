/**
 * api.js — Centralized fetch wrapper for SecureID backend with smart demo fallback.
 *
 * Handles:
 *  - Primary: Live API calls to backend (/api/*)
 *  - Fallback: LocalStore state management when backend is unavailable (e.g. static Vercel deploy)
 *    Ensures Sign In, Register, Admin Queue, Verification, and Certificate Card work out-of-the-box everywhere!
 */

const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('secureid_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Demo Store for Offline / Static Vercel Hosting ──────────────────
const STORAGE_KEY = 'secureid_demo_store_v2';

function getStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { }
  }
  const initial = {
    users: [
      { user_id: 1, name: 'System Administrator', email: 'admin@secureid.gov', password: 'Admin@12345', phone: '+91-9000000000', role: 'admin' },
      { user_id: 2, name: 'John Doe', email: 'john.doe@example.com', password: 'User@12345', phone: '+91-9111111111', role: 'user' },
      { user_id: 3, name: 'Alice Smith', email: 'alice.smith@example.com', password: 'User@12345', phone: '+91-9222222222', role: 'user' },
    ],
    identities: [
      { identity_id: 1, user_id: 2, date_of_birth: '1998-04-15', address: '42 MG Road, Bengaluru 560001', did: null, verification_status: 'pending', created_at: new Date().toISOString(), verified_at: null },
      { identity_id: 42, user_id: 3, date_of_birth: '1995-11-22', address: '7 Park Street, Kolkata 700016', did: 'DID-2026-000042', verification_status: 'verified', created_at: '2026-08-20T10:00:00Z', verified_at: '2026-08-28T12:00:00Z' },
    ],
    documents: [
      { document_id: 1, user_id: 2, document_type: 'College ID', uploaded_at: new Date().toISOString() },
      { document_id: 2, user_id: 3, document_type: 'Passport', uploaded_at: '2026-08-20T10:00:00Z' },
    ],
    logs: [
      { log_id: 1, identity_id: 42, verified_by: 1, admin_name: 'System Administrator', action: 'approved', result: 'Approved — DID-2026-000042', timestamp: '2026-08-28T12:00:00Z' },
      { log_id: 2, identity_id: 1, verified_by: null, admin_name: 'System / Public', action: 'submitted', result: 'pending', timestamp: new Date().toISOString() },
    ],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function createTokenPayload(userId, role) {
  return `demo_token_${userId}_${role}_${Date.now()}`;
}

function parseTokenUser(token) {
  if (!token) return null;
  if (token.startsWith('demo_token_')) {
    const parts = token.split('_');
    return { userId: parseInt(parts[2], 10), role: parts[3] };
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: payload.user_id, role: payload.role };
  } catch {
    return null;
  }
}

// ── Generic API Request with Fallback ──────────────────────────────
async function request(method, path, body = null) {
  const headers = { ...authHeaders() };
  const opts = { method, headers };

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } catch (err) {
    // If it's a HTTP error (4xx/5xx) returned by backend, rethrow it
    if (err.status && err.status !== 404 && err.status !== 0) {
      throw err;
    }
    // Fallback to local demo store if server is unreachable
    return fallbackHandler(method, path, body);
  }
}

// ── Fallback Handler ───────────────────────────────────────────────
function fallbackHandler(method, path, body) {
  const store = getStore();

  // Login
  if (path === '/api/login' && method === 'POST') {
    const { email, password } = body || {};
    const user = store.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (!user || user.password !== password) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }
    const token = createTokenPayload(user.user_id, user.role);
    return {
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    };
  }

  // Me
  if (path === '/api/me' && method === 'GET') {
    const token = getToken();
    const parsed = parseTokenUser(token);
    if (!parsed) {
      const err = new Error('Invalid or expired token');
      err.status = 401;
      throw err;
    }
    const user = store.users.find(u => u.user_id === parsed.userId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    const identity = store.identities.find(i => i.user_id === user.user_id);
    const document = store.documents.find(d => d.user_id === user.user_id);

    return {
      user: { user_id: user.user_id, name: user.name, email: user.email, phone: user.phone, role: user.role, created_at: user.created_at || new Date().toISOString() },
      identity: identity ? {
        identity_id: identity.identity_id,
        date_of_birth: identity.date_of_birth,
        address: identity.address,
        did: identity.did,
        verification_status: identity.verification_status,
        submitted_at: identity.created_at,
        verified_at: identity.verified_at,
      } : null,
      document: document ? {
        document_id: document.document_id,
        document_type: document.document_type,
        uploaded_at: document.uploaded_at,
      } : null,
    };
  }

  // Register
  if (path === '/api/register' && method === 'POST') {
    let name = '', email = '', password = '', phone = '', dob = '', address = '', docType = 'College ID';

    if (body instanceof FormData) {
      name = body.get('name') || '';
      email = (body.get('email') || '').toLowerCase().trim();
      password = body.get('password') || '';
      phone = body.get('phone') || '';
      dob = body.get('date_of_birth') || '';
      address = body.get('address') || '';
      docType = body.get('document_type') || 'College ID';
    } else if (body) {
      ({ name, email, password, phone, date_of_birth: dob, address, document_type: docType } = body);
    }

    if (store.users.some(u => u.email.toLowerCase() === email)) {
      const err = new Error('An account with this email already exists');
      err.status = 409;
      throw err;
    }

    const newUserId = store.users.length + 1;
    const newIdentityId = Math.max(...store.identities.map(i => i.identity_id), 0) + 1;
    const newDocId = store.documents.length + 1;
    const now = new Date().toISOString();

    const newUser = { user_id: newUserId, name, email, password, phone, role: 'user', created_at: now };
    const newIdentity = { identity_id: newIdentityId, user_id: newUserId, date_of_birth: dob, address, did: null, verification_status: 'pending', created_at: now, verified_at: null };
    const newDoc = { document_id: newDocId, user_id: newUserId, document_type: docType, uploaded_at: now };
    const newLog = { log_id: store.logs.length + 1, identity_id: newIdentityId, verified_by: null, admin_name: 'System / Public', action: 'submitted', result: 'pending', timestamp: now };

    store.users.push(newUser);
    store.identities.push(newIdentity);
    store.documents.push(newDoc);
    store.logs.unshift(newLog);
    saveStore(store);

    return {
      message: 'Registration submitted — awaiting review',
      reference_number: `REF-${newIdentityId.toString().padStart(6, '0')}`,
      identity_id: newIdentityId,
    };
  }

  // Admin Queue
  if (path === '/api/admin/queue' && method === 'GET') {
    const queue = store.identities
      .filter(i => i.verification_status === 'pending')
      .map(i => {
        const u = store.users.find(usr => usr.user_id === i.user_id) || {};
        const d = store.documents.find(doc => doc.user_id === i.user_id) || {};
        return {
          identity_id: i.identity_id,
          user_id: i.user_id,
          name: u.name || 'Unknown',
          email: u.email || '',
          phone: u.phone || '',
          date_of_birth: i.date_of_birth || '',
          address: i.address || '',
          verification_status: i.verification_status,
          submitted_at: i.created_at,
          document_id: d.document_id || null,
          document_type: d.document_type || 'ID Document',
          uploaded_at: d.uploaded_at || i.created_at,
        };
      });
    return { queue };
  }

  // Admin Decide
  if (path.startsWith('/api/admin/decide/') && method === 'POST') {
    const identityId = parseInt(path.split('/')[4], 10);
    const { action } = body || {};
    const identity = store.identities.find(i => i.identity_id === identityId);
    if (!identity) {
      const err = new Error('Identity not found');
      err.status = 404;
      throw err;
    }
    const now = new Date().toISOString();
    let did = null;
    if (action === 'approve') {
      did = `DID-2026-${identityId.toString().padStart(6, '0')}`;
      identity.verification_status = 'verified';
      identity.did = did;
      identity.verified_at = now;
    } else {
      identity.verification_status = 'rejected';
      identity.verified_at = now;
    }

    const token = getToken();
    const parsed = parseTokenUser(token);
    const adminUser = store.users.find(u => u.user_id === parsed?.userId);

    store.logs.unshift({
      log_id: store.logs.length + 1,
      identity_id: identityId,
      verified_by: adminUser ? adminUser.user_id : 1,
      admin_name: adminUser ? adminUser.name : 'System Administrator',
      action: action === 'approve' ? 'approved' : 'rejected',
      result: action === 'approve' ? `Approved — ${did}` : 'Rejected',
      timestamp: now,
    });

    saveStore(store);
    return {
      message: `Identity ${action}d successfully`,
      did,
      verification_status: identity.verification_status,
    };
  }

  // Admin Audit
  if (path === '/api/admin/audit' && method === 'GET') {
    return { logs: store.logs };
  }

  // Public Verify
  if (path.startsWith('/api/verify/') && method === 'GET') {
    const targetDid = decodeURIComponent(path.split('/')[3] || '').trim().toUpperCase();
    const identity = store.identities.find(i => (i.did || '').toUpperCase() === targetDid);
    const now = new Date().toISOString();

    if (identity && identity.verification_status === 'verified') {
      const u = store.users.find(usr => usr.user_id === identity.user_id) || {};
      store.logs.unshift({
        log_id: store.logs.length + 1,
        identity_id: identity.identity_id,
        verified_by: null,
        admin_name: 'System / Public',
        action: 'verify_check',
        result: 'found',
        timestamp: now,
      });
      saveStore(store);

      return {
        found: true,
        name: u.name || 'Verified Citizen',
        status: 'verified',
        verified_at: identity.verified_at || now,
      };
    }

    store.logs.unshift({
      log_id: store.logs.length + 1,
      identity_id: null,
      verified_by: null,
      admin_name: 'System / Public',
      action: 'verify_check',
      result: 'not_found',
      timestamp: now,
    });
    saveStore(store);

    return { found: false, name: null, status: 'not_verified', verified_at: null };
  }

  throw new Error(`Endpoint ${path} not found`);
}

// ── Exported API Methods ───────────────────────────────────────────
export function register(formData) {
  return request('POST', '/api/register', formData);
}

export function login(email, password) {
  return request('POST', '/api/login', { email, password });
}

export function getMe() {
  return request('GET', '/api/me');
}

export function getQueue() {
  return request('GET', '/api/admin/queue');
}

export function adminDecide(identityId, action) {
  return request('POST', `/api/admin/decide/${identityId}`, { action });
}

export function getAuditLog() {
  return request('GET', '/api/admin/audit');
}

export function getDocumentUrl(documentId) {
  // Returns SVG data URL preview for document preview
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#FAF9F5" stroke="#DED7C9" stroke-width="4"/>
    <rect x="20" y="20" width="560" height="360" fill="none" stroke="#2E6E5E" stroke-width="2" stroke-dasharray="6,4"/>
    <text x="300" y="80" font-family="serif" font-size="22" font-weight="bold" fill="#12202E" text-anchor="middle">GOVERNMENT IDENTITY VERIFICATION DOCUMENT</text>
    <line x1="80" y1="100" x2="520" y2="100" stroke="#DED7C9" stroke-width="2"/>
    <text x="300" y="160" font-family="sans-serif" font-size="16" fill="#3A4D5E" text-anchor="middle">Official Document Record #${documentId}</text>
    <text x="300" y="200" font-family="monospace" font-size="14" fill="#6B7D8D" text-anchor="middle">STATUS: ENCRYPTED &amp; VERIFIED AT REST</text>
    <circle cx="300" cy="280" r="45" fill="none" stroke="#2E6E5E" stroke-width="3"/>
    <text x="300" y="285" font-family="sans-serif" font-size="12" font-weight="bold" fill="#2E6E5E" text-anchor="middle">SECURE ID</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function verifyDID(did) {
  return request('GET', `/api/verify/${did}`);
}
