import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { login as loginApi, logout as logoutApi, fetchMe } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vikisol_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('vikisol_user');
    logoutApi();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    // Validate the stored session against the backend on load
    const token = localStorage.getItem('vikisol_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    fetchMe()
      .then((me) => {
        const userData = { id: me.id, email: me.email, firstName: me.firstName, lastName: me.lastName, name: `${me.firstName} ${me.lastName}`, role: me.role?.replace('ROLE_', '').toLowerCase() };
        setUser(userData);
        localStorage.setItem('vikisol_user', JSON.stringify(userData));
      })
      .catch(() => clearSession())
      .finally(() => setAuthLoading(false));
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    try {
      const loginData = await loginApi(email, password);
      // /auth/login's response has no `id` field (only email/role/names) - fetch the full
      // profile via /auth/me immediately so user.id is populated right away, same as the
      // session-restore path above. Without this, features gated on "is this my own record"
      // (e.g. the Linked Accounts panel) silently fail to recognize self-access until the next
      // page reload re-runs the fetchMe() effect.
      const me = await fetchMe();
      const userData = {
        id: me.id, email: me.email, firstName: me.firstName, lastName: me.lastName, name: `${me.firstName} ${me.lastName}`,
        role: me.role?.replace('ROLE_', '').toLowerCase(),
        // When true, the app must force the Change Password screen and block everything else -
        // the backend enforces this too (403s every other endpoint), this just drives the redirect.
        passwordExpired: !!loginData.passwordExpired,
      };
      setUser(userData);
      localStorage.setItem('vikisol_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid email or password' };
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  // Called once the forced Change Password screen succeeds, so the route guard stops redirecting.
  const clearPasswordExpired = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, passwordExpired: false };
      localStorage.setItem('vikisol_user', JSON.stringify(next));
      return next;
    });
  }, []);

  // Previously a fresh object literal every render (Phase 5 finding) - with 21 consumer files,
  // this meant every one of them re-rendered on any AuthProvider re-render regardless of whether
  // the auth state they actually use changed.
  const value = useMemo(() => ({ user, login, logout, isAuthenticated: !!user, authLoading, clearPasswordExpired }), [user, login, logout, authLoading, clearPasswordExpired]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
