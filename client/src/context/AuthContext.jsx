import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setApiToken } from '../services/api';

/**
 * Auth Context
 * Manages authentication state across the app.
 * 
 * Security improvements:
 * - Access token stored in memory (React state) only — protects from XSS localStorage exposure
 * - Refresh token stored in httpOnly cookie — safe from JavaScript access
 * - On page reload, axios interceptor silently re-fetches access token using refresh token
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
  const [token, setToken] = useState(null); // Stored in memory only, never in localStorage
  const [loading, setLoading] = useState(true);

  // On mount: verify if we have a valid session (via refresh token cookie)
  // The axios interceptor will handle silent token refresh
  useEffect(() => {
    const verifySession = async () => {
      try {
        // Try to get current user — if successful, we have a valid refresh token
        const res = await authAPI.getMe();
        setUser(res.data.data.user);
        // Token is now in memory via interceptor response
      } catch (err) {
        // No valid session — user needs to login
        setUser(null);
        setToken(null);
        setApiToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // Auto-logout: listen for custom logout event (from other tabs or interceptor)
  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
      setApiToken(null);
    };

    window.addEventListener('sv_logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('sv_logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, token: newToken } = res.data.data;
    
    // Store token in memory state and in API token store
    setUser(userData);
    setToken(newToken);
    setApiToken(newToken); // Update axios interceptor token store
    
    // Refresh token is stored in httpOnly cookie by backend/interceptor
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { user: userData, token: newToken } = res.data.data;
    
    // Store token in memory state and in API token store
    setUser(userData);
    setToken(newToken);
    setApiToken(newToken); // Update axios interceptor token store
    
    // Refresh token is stored in httpOnly cookie by backend/interceptor
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
    setApiToken(null);
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
