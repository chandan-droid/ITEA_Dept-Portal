import { apiClient } from './apiClient';

/**
 * Calendar API client.
 * All methods are read-only — the calendar never mutates any data.
 */
export const calendarApi = {
  /**
   * Fetch calendar events for the given date range.
   * @param {Object} params
   * @param {string} params.startDate - ISO date string (YYYY-MM-DD)
   * @param {string} params.endDate   - ISO date string (YYYY-MM-DD)
   * @param {string[]} [params.types] - Array of CalendarEventType strings (optional)
   * @param {number}  [params.projectId] - Filter by project (optional)
   */
  getEvents: async ({ startDate, endDate, types, projectId } = {}) => {
    const qp = new URLSearchParams();
    qp.set('startDate', startDate);
    qp.set('endDate', endDate);
    if (types && types.length > 0) qp.set('types', types.join(','));
    if (projectId) qp.set('projectId', projectId);
    const res = await apiClient.get(`/api/calendar?${qp.toString()}`);
    return res.data;
  },

  /**
   * Fetch all calendar events for today.
   */
  getTodayEvents: async () => {
    const res = await apiClient.get('/api/calendar/today');
    return res.data;
  },

  /**
   * Fetch the next upcoming events.
   * @param {number} [limit=10]
   */
  getUpcomingEvents: async (limit = 10) => {
    const res = await apiClient.get(`/api/calendar/upcoming?limit=${limit}`);
    return res.data;
  },
};
