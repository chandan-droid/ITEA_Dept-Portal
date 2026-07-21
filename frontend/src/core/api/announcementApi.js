import { apiClient } from './apiClient';

const extractData = (response) => {
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'API request failed');
};

const handleError = (error, consoleMsg) => {
  console.error(consoleMsg, error);
  if (error.response && error.response.data) {
    const apiMsg = error.response.data.message || error.response.data.error;
    if (apiMsg) throw new Error(apiMsg);
  }
  throw new Error(error.message || 'Server connection error');
};

export const announcementApi = {
  create: async (data) => {
    try {
      const response = await apiClient.post('/api/announcements', data);
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API create announcement failed:');
    }
  },

  update: async (id, data) => {
    try {
      const response = await apiClient.put(`/api/announcements/${id}`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update announcement failed for ${id}:`);
    }
  },

  publish: async (id) => {
    try {
      const response = await apiClient.patch(`/api/announcements/${id}/publish`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API publish announcement failed for ${id}:`);
    }
  },

  schedule: async (id, data) => {
    try {
      const response = await apiClient.patch(`/api/announcements/${id}/schedule`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API schedule announcement failed for ${id}:`);
    }
  },

  archive: async (id) => {
    try {
      const response = await apiClient.patch(`/api/announcements/${id}/archive`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API archive announcement failed for ${id}:`);
    }
  },

  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/api/announcements/${id}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete announcement failed for ${id}:`);
    }
  },

  getAnnouncements: async (params) => {
    try {
      const response = await apiClient.get('/api/announcements', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API getAnnouncements failed:');
    }
  },

  getById: async (id) => {
    try {
      const response = await apiClient.get(`/api/announcements/${id}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get announcement details failed for ${id}:`);
    }
  },
};
