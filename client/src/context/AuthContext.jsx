import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

/**
 * Auth Context
 * Manages authentication state across the app.
 * - Uses access token in localStorage + refresh token in httpOnly cookie
 * - Auto-logout when refresh fails
 * - Loading state prevents flash of login page
 */

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sv_token'));
  const [loading, setLoading] = useState(true);

  // On mount: verify stored token is still valid
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('sv_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await authAPI.getMe();
        setUser(res.data.data.user);
        setToken(storedToken);
      } catch (err) {
        // Token invalid and refresh also failed (interceptor handles refresh)
        localStorage.removeItem('sv_token');
        localStorage.removeItem('sv_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Auto-logout: listen for storage events (e.g. token removed by interceptor)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sv_token' && !e.newValue) {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, token: newToken } = res.data.data;
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('sv_token', newToken);
    localStorage.setItem('sv_user', JSON.stringify(userData));
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { user: userData, token: newToken } = res.data.data;
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('sv_token', newToken);
    localStorage.setItem('sv_user', JSON.stringify(userData));
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout(); // Clear refresh token on server + cookie
    } catch (err) {
      // Best effort — even if API call fails, clear local state
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('sv_token');
    localStorage.removeItem('sv_user');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
