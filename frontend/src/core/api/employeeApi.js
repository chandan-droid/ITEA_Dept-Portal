import { apiClient } from './apiClient';

export const employeeApi = {
  getAll: async (params) => {
    try {
      const response = await apiClient.get('/api/employees', { params });
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch team members');
    } catch (error) {
      console.error('API list employees failed:', error);
      if (error.response && error.response.data) {
        const apiMsg = error.response.data.message || error.response.data.error;
        if (apiMsg) {
          throw new Error(apiMsg);
        }
      }
      throw new Error(error.message || 'Server connection error');
    }
  },

  getById: async (userId) => {
    try {
      const response = await apiClient.get(`/api/employees/${userId}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch employee details');
    } catch (error) {
      console.error(`API get employee details failed for user ${userId}:`, error);
      if (error.response && error.response.data) {
        const apiMsg = error.response.data.message || error.response.data.error;
        if (apiMsg) {
          throw new Error(apiMsg);
        }
      }
      throw new Error(error.message || 'Server connection error');
    }
  },

  activate: async (userId) => {
    try {
      const response = await apiClient.put(`/api/employees/${userId}/activate`);
      if (response.data && response.data.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to activate employee');
    } catch (error) {
      console.error(`API activate user failed for user ${userId}:`, error);
      if (error.response && error.response.data) {
        const apiMsg = error.response.data.message || error.response.data.error;
        if (apiMsg) {
          throw new Error(apiMsg);
        }
      }
      throw new Error(error.message || 'Server connection error');
    }
  },

  deactivate: async (userId) => {
    try {
      const response = await apiClient.put(`/api/employees/${userId}/deactivate`);
      if (response.data && response.data.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to deactivate employee');
    } catch (error) {
      console.error(`API deactivate user failed for user ${userId}:`, error);
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
