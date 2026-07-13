import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../../core/api/authApi';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (error) {
          console.error('Session initialization failed:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('auth_user');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      
      const userData = {
        name: response.name,
        email: response.email,
        role: response.role
      };

      localStorage.setItem('access_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      setUser(userData);
      setToken(response.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout endpoint failed:', e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const hasPermission = () => {
    return true; // Simplified: Dashboard and Profile are always allowed
  };

  const hasRole = (roleName) => {
    if (!user) return false;
    return user.role === roleName;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
