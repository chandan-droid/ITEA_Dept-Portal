import { apiClient } from './apiClient';

export const attendanceApi = {
  getToday: async () => {
    const res = await apiClient.get('/api/attendance/today');
    return res.data.data;
  },

  checkIn: async (coords) => {
    const res = await apiClient.post('/api/attendance/check-in', coords);
    return res.data.data;
  },

  checkOut: async () => {
    const res = await apiClient.post('/api/attendance/check-out');
    return res.data.data;
  },

  getCalendar: async (month, year) => {
    const res = await apiClient.get('/api/attendance/calendar', {
      params: { month, year }
    });
    return res.data.data;
  },

  getHistory: async (params) => {
    const res = await apiClient.get('/api/attendance/history', { params });
    return res.data.data;
  },

  search: async (params) => {
    const res = await apiClient.get('/api/attendance/search', { params });
    return res.data.data;
  },

  getTeamAttendance: async (date) => {
    const res = await apiClient.get('/api/team/attendance', {
      params: { date }
    });
    return res.data.data;
  },

  getReport: async (fromDate, toDate) => {
    const res = await apiClient.get('/api/reports/attendance', {
      params: { fromDate, toDate }
    });
    return res.data.data;
  },

  getTeamReport: async (fromDate, toDate) => {
    const res = await apiClient.get('/api/reports/team-attendance', {
      params: { fromDate, toDate }
    });
    return res.data.data;
  },

  getLeaveBalances: async () => {
    const res = await apiClient.get('/api/leaves/balances');
    return res.data.data;
  },

  getLeaveTypes: async () => {
    const res = await apiClient.get('/api/leaves/types');
    return res.data.data;
  },

  getMyLeaves: async () => {
    const res = await apiClient.get('/api/leaves/requests/my');
    return res.data.data;
  },

  submitLeave: async (requestData) => {
    const res = await apiClient.post('/api/leaves/requests', requestData);
    return res.data.data;
  },

  getPendingLeaves: async () => {
    const res = await apiClient.get('/api/leaves/requests/pending');
    return res.data.data;
  },

  approveLeave: async (id) => {
    const res = await apiClient.post(`/api/leaves/requests/${id}/approve`);
    return res.data.data;
  },

  rejectLeave: async (id, reason) => {
    const res = await apiClient.post(`/api/leaves/requests/${id}/reject`, null, {
      params: { reason }
    });
    return res.data.data;
  },

  submitWfh: async (requestData) => {
    const res = await apiClient.post('/api/wfh/requests', requestData);
    return res.data.data;
  },

  getMyWfh: async () => {
    const res = await apiClient.get('/api/wfh/requests/my');
    return res.data.data;
  },

  getHolidays: async (fromDate, toDate) => {
    const res = await apiClient.get('/api/holidays', {
      params: { fromDate, toDate }
    });
    return res.data.data;
  }
};
