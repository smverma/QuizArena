import { createContext, useContext, useState, useEffect } from 'react';
import { login, getSession, setSession, clearSession } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const stored = getSession();
    if (stored) setUser(stored);
  }, []);

  /**
   * Login or register via the backend API.
   * The server creates a new account if the username doesn't exist yet.
   * On success, { username, pin, totalScore } is stored in session.
   *
   * @returns {Promise<{ success: boolean, error?: string, isServerError?: boolean }>}
   */
  const authenticate = async (username, pin) => {
    try {
      const data = await login(username, pin);
      if (!data.ok) {
        return { success: false, error: data.error };
      }
      const session = { username: data.user.username, pin, totalScore: data.user.totalScore };
      setSession(session);
      setUser(session);
      return { success: true };
    } catch (err) {
      // Treat network failures (no status) or 5xx responses as server errors
      const isServerError = !err.status || err.status >= 500;
      return { success: false, error: err.message, isServerError };
    }
  };

  /**
   * Start a guest session – progress and scores won't be persisted.
   */
  const loginAsGuest = () => {
    const session = { username: 'Guest', pin: null, isGuest: true, totalScore: 0 };
    setSession(session);
    setUser(session);
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, authenticate, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
