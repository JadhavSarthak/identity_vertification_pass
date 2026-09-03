/**
 * api.js — Centralized fetch wrapper for SecureID backend.
 *
 * Handles:
 *  - JWT Authorization header injection
 *  - JSON parsing and error propagation
 *  - Multipart form data for file uploads
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('secureid_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Generic JSON request.
 */
async function request(method, path, body = null) {
  const headers = { ...authHeaders() };
  const opts = { method, headers };

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
    // Don't set Content-Type — browser sets multipart boundary automatically
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch {
    // Network-level failure (DNS, connection refused, CORS, offline)
    const err = new Error('Network error — unable to reach the server.');
    err.status = 0;
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    const err = new Error(`Server returned non-JSON response (${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ── Auth ───────────────────────────────────────────────────────
export function register(formData) {
  return request('POST', '/api/register', formData);
}

export function login(email, password) {
  return request('POST', '/api/login', { email, password });
}

export function getMe() {
  return request('GET', '/api/me');
}

// ── Admin ──────────────────────────────────────────────────────
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
  const token = getToken();
  return `${API_URL}/api/admin/document/${documentId}?token=${token}`;
}

// ── Public Verify ──────────────────────────────────────────────
export function verifyDID(did) {
  return request('GET', `/api/verify/${did}`);
}
