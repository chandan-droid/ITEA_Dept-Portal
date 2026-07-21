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

export const projectApi = {
  create: async (data) => {
    try {
      const response = await apiClient.post('/api/projects', data);
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API create project failed:');
    }
  },

  getMyProjects: async (params) => {
    try {
      const response = await apiClient.get('/api/projects/my', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get my projects failed:');
    }
  },

  getTeamProjects: async (params) => {
    try {
      const response = await apiClient.get('/api/projects', { params });
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get team projects failed:');
    }
  },

  getById: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project details failed for ${projectId}:`);
    }
  },

  update: async (projectId, data) => {
    try {
      const response = await apiClient.put(`/api/projects/${projectId}`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update project failed for ${projectId}:`);
    }
  },

  delete: async (projectId) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete project failed for ${projectId}:`);
    }
  },

  changeStatus: async (projectId, status) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}/status`, { status });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API change project status failed for ${projectId}:`);
    }
  },

  archive: async (projectId) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}/archive`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API archive project failed for ${projectId}:`);
    }
  },

  assignManager: async (projectId, managerId) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}/manager`, { managerId });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API assign project manager failed for ${projectId}:`);
    }
  },

  addMembers: async (projectId, members) => {
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/members`, { members });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API add project members failed for ${projectId}:`);
    }
  },

  getMembers: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/members`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project members failed for ${projectId}:`);
    }
  },

  updateMemberRole: async (projectId, memberId, projectRole) => {
    try {
      const response = await apiClient.put(`/api/projects/${projectId}/members/${memberId}`, { projectRole });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update project member role failed for ${memberId}:`);
    }
  },

  removeMember: async (projectId, memberId) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/members/${memberId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API remove project member failed for ${memberId}:`);
    }
  },

  uploadDocument: async (projectId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/api/projects/${projectId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API upload project document failed for ${projectId}:`);
    }
  },

  getDocuments: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/documents`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project documents failed for ${projectId}:`);
    }
  },

  deleteDocument: async (projectId, documentId) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/documents/${documentId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete project document failed for ${documentId}:`);
    }
  },

  addComment: async (projectId, comment) => {
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/comments`, { comment });
      return extractData(response);
    } catch (error) {
      return handleError(error, `API add project comment failed for ${projectId}:`);
    }
  },

  getComments: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/comments`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project comments failed for ${projectId}:`);
    }
  },

  deleteComment: async (projectId, commentId) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/comments/${commentId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete project comment failed for ${commentId}:`);
    }
  },

  createMilestone: async (projectId, data) => {
    try {
      const response = await apiClient.post(`/api/projects/${projectId}/milestones`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API create milestone failed for ${projectId}:`);
    }
  },

  getMilestones: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/milestones`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get milestones failed for ${projectId}:`);
    }
  },

  updateMilestone: async (projectId, milestoneId, data) => {
    try {
      const response = await apiClient.put(`/api/projects/${projectId}/milestones/${milestoneId}`, data);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API update milestone failed for ${milestoneId}:`);
    }
  },

  deleteMilestone: async (projectId, milestoneId) => {
    try {
      const response = await apiClient.delete(`/api/projects/${projectId}/milestones/${milestoneId}`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API delete milestone failed for ${milestoneId}:`);
    }
  },

  completeMilestone: async (projectId, milestoneId) => {
    try {
      const response = await apiClient.patch(`/api/projects/${projectId}/milestones/${milestoneId}/complete`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API complete milestone failed for ${milestoneId}:`);
    }
  },

  getActivities: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/activities`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project activities failed for ${projectId}:`);
    }
  },

  getReport: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/report`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project report failed for ${projectId}:`);
    }
  },

  getDashboard: async () => {
    try {
      const response = await apiClient.get('/api/projects/dashboard');
      return extractData(response);
    } catch (error) {
      return handleError(error, 'API get project dashboard failed:');
    }
  },

  getStatistics: async (projectId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/statistics`);
      return extractData(response);
    } catch (error) {
      return handleError(error, `API get project statistics failed for ${projectId}:`);
    }
  },
};
