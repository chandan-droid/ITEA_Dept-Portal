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

export const notificationApi = {
  getNotifications: async (params) => {
    try {
      const response = await apiClient.get('/api/notifications', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API getNotifications failed:');
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/api/notifications/unread-count');
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API getUnreadCount failed:');
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await apiClient.patch(`/api/notifications/${id}/read`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API markAsRead failed for ${id}:`);
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await apiClient.patch('/api/notifications/read-all');
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API markAllAsRead failed:');
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await apiClient.delete(`/api/notifications/${id}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API deleteNotification failed for ${id}:`);
    }
  },
};
