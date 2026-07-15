import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { login as loginApi, verifyMfa as verifyMfaApi, requestLoginOtp, verifyLoginOtp, logout as logoutApi, fetchMe } from '../api/auth';
import { setUnauthorizedHandler, resetUnauthorizedGuard } from '../api/client';
import { clearMyProfileCache } from '../api/employees';

const AuthContext = createContext(null);

function toUserData(me, extra = {}) {
  return {
    id: me.id, email: me.email, firstName: me.firstName, lastName: me.lastName, name: `${me.firstName} ${me.lastName}`,
    role: me.role?.replace('ROLE_', '').toLowerCase(),
    ...extra,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vikisol_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('vikisol_user');
    clearMyProfileCache();
    // Fire-and-forget - the session is being torn down client-side regardless of whether the
    // network call itself succeeds (e.g. the access token that would authorize it may already be
    // the exact thing that just expired).
    logoutApi();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    // The access token now lives in an HttpOnly cookie - JS can't check whether one exists, so
    // this always has to ask the server "who am I" on load rather than gating on a localStorage
    // token-presence check like before. A 401 here just means "not logged in", handled the same
    // as any other unauthenticated visit.
    fetchMe()
      .then((me) => {
        const userData = toUserData(me);
        setUser(userData);
        localStorage.setItem('vikisol_user', JSON.stringify(userData));
        resetUnauthorizedGuard();
      })
      .catch(() => clearSession())
      .finally(() => setAuthLoading(false));
  }, [clearSession]);

  const login = useCallback(async (email, password, remember = false) => {
    try {
      const loginData = await loginApi(email, password, remember);
      if (loginData.mfaRequired) {
        return { success: false, mfaRequired: true, challengeToken: loginData.challengeToken };
      }
      // /auth/login's response has no `id` field (only email/role/names) - fetch the full
      // profile via /auth/me immediately so user.id is populated right away, same as the
      // session-restore path above. Without this, features gated on "is this my own record"
      // (e.g. the Linked Accounts panel) silently fail to recognize self-access until the next
      // page reload re-runs the fetchMe() effect.
      const me = await fetchMe();
      const userData = toUserData(me, {
        // When true, the app must force the Change Password screen and block everything else -
        // the backend enforces this too (403s every other endpoint), this just drives the redirect.
        passwordExpired: !!loginData.passwordExpired,
      });
      setUser(userData);
      localStorage.setItem('vikisol_user', JSON.stringify(userData));
      resetUnauthorizedGuard();
      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid email or password' };
    }
  }, []);

  // Second step of login when MFA is enabled for the account - see Login.jsx's code-entry screen.
  const completeMfaLogin = useCallback(async (challengeToken, code, remember = false) => {
    try {
      const loginData = await verifyMfaApi(challengeToken, code, remember);
      const me = await fetchMe();
      const userData = toUserData(me, { passwordExpired: !!loginData.passwordExpired });
      setUser(userData);
      localStorage.setItem('vikisol_user', JSON.stringify(userData));
      resetUnauthorizedGuard();
      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid or expired code' };
    }
  }, []);

  // OTP Login - step 1: email a 6-digit code. Same success-shaped-regardless-of-account-existence
  // contract as Forgot Password, so no meaningful error to surface here beyond a network failure.
  const requestOtp = useCallback(async (email) => {
    try {
      await requestLoginOtp(email);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Could not send the code. Please try again.' };
    }
  }, []);

  // OTP Login - step 2: verify the code and complete login exactly like completeMfaLogin above.
  const completeOtpLogin = useCallback(async (email, code, remember = false) => {
    try {
      const loginData = await verifyLoginOtp(email, code, remember);
      const me = await fetchMe();
      const userData = toUserData(me, { passwordExpired: !!loginData.passwordExpired });
      setUser(userData);
      localStorage.setItem('vikisol_user', JSON.stringify(userData));
      resetUnauthorizedGuard();
      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid or expired code' };
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('vikisol_user');
    clearMyProfileCache();
    await logoutApi();
  }, []);

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
  const value = useMemo(() => ({ user, login, completeMfaLogin, requestOtp, completeOtpLogin, logout, isAuthenticated: !!user, authLoading, clearPasswordExpired }),
    [user, login, completeMfaLogin, requestOtp, completeOtpLogin, logout, authLoading, clearPasswordExpired]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
