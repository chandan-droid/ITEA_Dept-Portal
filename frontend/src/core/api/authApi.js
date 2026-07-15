import { apiClient } from './apiClient';

export const authApi = {
  login: async (request) => {
    try {
      const response = await apiClient.post('/api/auth/login', request);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Login failed');
    } catch (error) {
      console.error('API login failed:', error);
      if (error.response && error.response.data) {
        const apiMsg = error.response.data.message || error.response.data.error;
        if (apiMsg) {
          throw new Error(apiMsg);
        }
      }
      throw new Error(error.message || 'Server connection error or invalid credentials');
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (e) {
      console.warn('Logout endpoint returned error', e);
    }
  },

  getMe: async () => {
    try {
      const response = await apiClient.get('/api/me');
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to retrieve profile');
    } catch (error) {
      console.error('API getMe failed:', error);
      if (error.response && error.response.data) {
        const apiMsg = error.response.data.message || error.response.data.error;
        if (apiMsg) {
          throw new Error(apiMsg);
        }
      }
      throw new Error(error.message || 'Server connection error');
    }
  }
};
