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
    if (apiMsg) {
      throw new Error(apiMsg);
    }
  }
  throw new Error(error.message || 'Server connection error');
};

export const taskApi = {
  create: async (data) => {
    try {
      const response = await apiClient.post('/api/tasks', data);
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API create task failed:');
    }
  },

  getMyTasks: async (params) => {
    try {
      const response = await apiClient.get('/api/tasks/my', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get my tasks failed:');
    }
  },

  getTeamTasks: async (params) => {
    try {
      const response = await apiClient.get('/api/tasks', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get team tasks failed:');
    }
  },

  getById: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get task details failed for ${taskId}:`);
    }
  },

  update: async (taskId, data) => {
    try {
      const response = await apiClient.put(`/api/tasks/${taskId}`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update task failed for ${taskId}:`);
    }
  },

  updateProgress: async (taskId, progress) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/progress`, { progress });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update progress failed for ${taskId}:`);
    }
  },

  updateStatus: async (taskId, status) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/status`, { status });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update status failed for ${taskId}:`);
    }
  },

  delete: async (taskId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete task failed for ${taskId}:`);
    }
  },

  forceDelete: async (taskId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/force`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API force delete task failed for ${taskId}:`);
    }
  },

  startWork: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/start`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API start work failed for ${taskId}:`);
    }
  },

  submitReview: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/submit-review`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API submit review failed for ${taskId}:`);
    }
  },

  hold: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/hold`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API hold failed for ${taskId}:`);
    }
  },

  resume: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/resume`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API resume failed for ${taskId}:`);
    }
  },

  archive: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/archive`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API archive task failed for ${taskId}:`);
    }
  },

  approve: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/approve`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API approve task failed for ${taskId}:`);
    }
  },

  requestChanges: async (taskId, reviewComments) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/request-changes`, { reviewComments });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API request changes failed for ${taskId}:`);
    }
  },

  cancel: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/cancel`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API cancel task failed for ${taskId}:`);
    }
  },

  reopen: async (taskId) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/reopen`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API reopen task failed for ${taskId}:`);
    }
  },

  getAssignees: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/assignees`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get assignees failed for ${taskId}:`);
    }
  },

  assignUsers: async (taskId, userIds) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/assignees`, { userIds });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API assign users failed for ${taskId}:`);
    }
  },

  removeAssignee: async (taskId, userId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/assignees/${userId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API remove assignee failed for ${userId}:`);
    }
  },

  getComments: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/comments`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get comments failed for ${taskId}:`);
    }
  },

  addComment: async (taskId, comment) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/comments`, { comment });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API add comment failed for ${taskId}:`);
    }
  },

  deleteComment: async (taskId, commentId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/comments/${commentId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete comment failed for ${commentId}:`);
    }
  },

  getChecklist: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/checklist`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get checklist failed for ${taskId}:`);
    }
  },

  addChecklistItem: async (taskId, title) => {
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/checklist`, { title });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API add checklist item failed for ${taskId}:`);
    }
  },

  updateChecklistItem: async (taskId, itemId, title) => {
    try {
      const response = await apiClient.put(`/api/tasks/${taskId}/checklist/${itemId}`, { title });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update checklist item failed for ${itemId}:`);
    }
  },

  markChecklistItem: async (taskId, itemId, completed) => {
    try {
      const response = await apiClient.patch(`/api/tasks/${taskId}/checklist/${itemId}`, { completed });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API mark checklist item failed for ${itemId}:`);
    }
  },

  deleteChecklistItem: async (taskId, itemId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/checklist/${itemId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete checklist item failed for ${itemId}:`);
    }
  },

  getAttachments: async (taskId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/attachments`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get attachments failed for ${taskId}:`);
    }
  },

  uploadAttachment: async (taskId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/api/tasks/${taskId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API upload attachment failed for ${taskId}:`);
    }
  },

  deleteAttachment: async (taskId, attachmentId) => {
    try {
      const response = await apiClient.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete attachment failed for ${attachmentId}:`);
    }
  },

  downloadAttachment: async (taskId, attachmentId) => {
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      return handleError(error, `API download attachment failed:`);
    }
  },

  getActivityLog: async (params) => {
    try {
      const response = await apiClient.get('/api/tasks/activity', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get task activity log failed:');
    }
  },

  getReports: async () => {
    try {
      const response = await apiClient.get('/api/tasks/reports');
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get task reports failed:');
    }
  },

  getDashboard: async () => {
    try {
      const response = await apiClient.get('/api/tasks/dashboard');
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get task dashboard failed:');
    }
  },
};
