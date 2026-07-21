import { apiClient } from './apiClient';

export const attendanceApi = {
  // Attendance
  getToday: async () => {
    const res = await apiClient.get('/api/attendance/today');
    return res.data.data;
  },

  getStatus: async () => {
    const res = await apiClient.get('/api/attendance/status');
    return res.data.data;
  },

  checkIn: async (coords) => {
    const res = await apiClient.post('/api/attendance/check-in', coords);
    return res.data.data;
  },

  checkOut: async (coords) => {
    const res = await apiClient.post('/api/attendance/check-out', coords || null);
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

  // Team
  getTeamAttendance: async (date) => {
    const res = await apiClient.get('/api/team/attendance', {
      params: { date }
    });
    return res.data.data;
  },

  getEmployeeAttendance: async (employeeId, params) => {
    const res = await apiClient.get(`/api/team/attendance/${employeeId}`, { params });
    return res.data.data;
  },

  getTeamAttendanceSummary: async (date) => {
    const res = await apiClient.get('/api/team/attendance/summary', {
      params: { date }
    });
    return res.data.data;
  },

  // Leaves
  getLeaveBalances: async () => {
    const res = await apiClient.get('/api/leaves/balances');
    return res.data.data;
  },

  getLeaveTypes: async () => {
    const res = await apiClient.get('/api/leaves/types');
    return res.data.data;
  },

  getMyLeaves: async () => {
    const res = await apiClient.get('/api/leaves/my');
    return res.data.data;
  },

  submitLeave: async (requestData) => {
    const res = await apiClient.post('/api/leaves', requestData);
    return res.data.data;
  },

  cancelLeave: async (id) => {
    const res = await apiClient.patch(`/api/leaves/${id}/cancel`);
    return res.data.data;
  },

  getTeamLeaves: async () => {
    const res = await apiClient.get('/api/leaves/team');
    return res.data.data;
  },

  getPendingLeaves: async () => {
    const res = await apiClient.get('/api/leaves/pending');
    return res.data.data;
  },

  approveLeave: async (id) => {
    const res = await apiClient.patch(`/api/leaves/${id}/approve`);
    return res.data.data;
  },

  rejectLeave: async (id, reason) => {
    const res = await apiClient.patch(`/api/leaves/${id}/reject`, null, {
      params: { reason }
    });
    return res.data.data;
  },

  // WFH
  submitWfh: async (requestData) => {
    const res = await apiClient.post('/api/wfh', requestData);
    return res.data.data;
  },

  getMyWfh: async () => {
    const res = await apiClient.get('/api/wfh/my');
    return res.data.data;
  },

  getWfhById: async (id) => {
    const res = await apiClient.get(`/api/wfh/${id}`);
    return res.data.data;
  },

  cancelWfh: async (id) => {
    const res = await apiClient.patch(`/api/wfh/${id}/cancel`);
    return res.data.data;
  },

  getTeamWfh: async () => {
    const res = await apiClient.get('/api/wfh/team');
    return res.data.data;
  },

  getPendingWfh: async () => {
    const res = await apiClient.get('/api/wfh/pending');
    return res.data.data;
  },

  approveWfh: async (id) => {
    const res = await apiClient.patch(`/api/wfh/${id}/approve`);
    return res.data.data;
  },

  rejectWfh: async (id) => {
    const res = await apiClient.patch(`/api/wfh/${id}/reject`);
    return res.data.data;
  },

  // Holidays
  getHolidays: async (fromDate, toDate) => {
    const res = await apiClient.get('/api/holidays', {
      params: { fromDate, toDate }
    });
    return res.data.data;
  },

  createHoliday: async (holidayData) => {
    const res = await apiClient.post('/api/holidays', holidayData);
    return res.data.data;
  },

  updateHoliday: async (id, holidayData) => {
    const res = await apiClient.put(`/api/holidays/${id}`, holidayData);
    return res.data.data;
  },

  deleteHoliday: async (id) => {
    const res = await apiClient.delete(`/api/holidays/${id}`);
    return res.data.data;
  },

  // Reports
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

  exportReport: async (fromDate, toDate, format = 'csv') => {
    const res = await apiClient.get('/api/reports/attendance/export', {
      params: { fromDate, toDate, format },
      responseType: 'blob'
    });
    return res.data;
  }
};
