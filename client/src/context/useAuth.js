import { useContext } from 'react';
import AuthContext from './AuthContext';

// Re-export the context for direct access if needed
export { AuthContext };

/**
 * useAuth Hook
 * Provides access to the authentication context.
 * Must be used within an AuthProvider.
 *
 * Returns:
 * - user: Current user object (or null)
 * - token: Access token stored in memory
 * - loading: Whether the initial session check is in progress
 * - isAuthenticated: Boolean shorthand for logged-in state
 * - login(email, password): Login handler
 * - register(name, email, password): Register handler
 * - logout(): Logout handler
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
