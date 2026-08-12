import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * Custom hook to use authentication context
 * Provides easy access to auth state and methods
 *
 * @throws {Error} If used outside of AuthProvider
 * @returns {object} - Auth context value
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default useAuth;
