import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../../core/api/authApi';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncProfile = async () => {
    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setRoles(data.roles || []);
      setPermissions(data.permissions || {});
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_roles', JSON.stringify(data.roles || []));
      localStorage.setItem('auth_permissions', JSON.stringify(data.permissions || {}));
    } catch (error) {
      console.error('Failed to sync profile details:', error);
      if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized'))) {
        handleLocalLogout();
      }
    }
  };

  const handleLocalLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_roles');
    localStorage.removeItem('auth_permissions');
    setUser(null);
    setRoles([]);
    setPermissions({});
    setToken(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('auth_user');
      const storedRoles = localStorage.getItem('auth_roles');
      const storedPermissions = localStorage.getItem('auth_permissions');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setRoles(storedRoles ? JSON.parse(storedRoles) : []);
          setPermissions(storedPermissions ? JSON.parse(storedPermissions) : {});
          setToken(storedToken);
          setIsLoading(false);
          
          await syncProfile();
          return;
        } catch (error) {
          console.error('Session initialization failed:', error);
          handleLocalLogout();
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
      localStorage.setItem('access_token', response.token);
      setToken(response.token);

      const data = await authApi.getMe();
      setUser(data.user);
      setRoles(data.roles || []);
      setPermissions(data.permissions || {});
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_roles', JSON.stringify(data.roles || []));
      localStorage.setItem('auth_permissions', JSON.stringify(data.permissions || {}));
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
      handleLocalLogout();
      setIsLoading(false);
    }
  };

  const hasPermission = (permissionName) => {
    if (!permissions) return false;
    return Object.values(permissions).some((permsList) => 
      permsList && permsList.includes(permissionName)
    );
  };

  const hasRole = (roleName) => {
    if (!user) return false;
    return user.role === roleName || roles.some((r) => r.roleName === roleName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
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
