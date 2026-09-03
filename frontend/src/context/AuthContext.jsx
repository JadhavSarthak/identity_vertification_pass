import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem('secureid_token');
    if (!token) {
      setUser(null);
      setIdentity(null);
      setDocument(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getMe();
      setUser(data.user);
      setIdentity(data.identity);
      setDocument(data.document);
    } catch {
      // Token invalid / expired
      localStorage.removeItem('secureid_token');
      setUser(null);
      setIdentity(null);
      setDocument(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUser();
  }, []);

  function loginSuccess(token, userData) {
    localStorage.setItem('secureid_token', token);
    setUser(userData);
    loadUser(); // Fetch full profile
  }

  function logout() {
    localStorage.removeItem('secureid_token');
    setUser(null);
    setIdentity(null);
    setDocument(null);
  }

  return (
    <AuthContext.Provider value={{ user, identity, document, loading, loginSuccess, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
