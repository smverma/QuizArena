import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, userExists } from '../db/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('quizArenaUser');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (username, pin) => {
    const result = loginUser(username, pin);
    if (result.success) {
      setUser({ username });
      sessionStorage.setItem('quizArenaUser', JSON.stringify({ username }));
    }
    return result;
  };

  const register = (username, pin) => {
    const result = registerUser(username, pin);
    if (result.success) {
      setUser({ username });
      sessionStorage.setItem('quizArenaUser', JSON.stringify({ username }));
    }
    return result;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('quizArenaUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, userExists }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
