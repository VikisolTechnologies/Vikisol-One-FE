import { createContext, useContext, useState, useCallback } from 'react';
import { USERS } from '../data/mock';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vikisol_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem('vikisol_user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('vikisol_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
