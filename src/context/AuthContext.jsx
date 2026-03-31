import { createContext, useContext, useState, useEffect } from 'react';
import {
  authPin,
  checkUser,
  getStoredUser,
  storeUser,
  setToken,
  clearSession,
} from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  /**
   * Login or register via the backend API.
   * The server decides based on whether the username exists.
   * PIN is sent only once and never stored client-side.
   *
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const authenticate = async (username, pin) => {
    try {
      const { token, user: apiUser } = await authPin(username, pin);
      setToken(token);
      storeUser(apiUser);
      setUser(apiUser);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Check if a username is already registered (async).
   * @returns {Promise<boolean>}
   */
  const userExists = async (username) => {
    try {
      const { exists } = await checkUser(username);
      return exists;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, authenticate, logout, userExists }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
