import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../core/api/notificationApi';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Search, 
  ExternalLink, 
  Megaphone, 
  CheckSquare, 
  FolderKanban, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters & Pagination
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, TASK, PROJECT, ANNOUNCEMENT, UNREAD
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    loadNotifications();
  }, [activeTab, page]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size: pageSize,
      };

      if (activeTab === 'UNREAD') {
        params.read = false;
      } else if (activeTab !== 'ALL') {
        params.type = activeTab;
      }

      const response = await notificationApi.getNotifications(params);
      setNotifications(response?.content || []);
      setTotalPages(response?.totalPages || 1);
      setTotalElements(response?.totalElements || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
      setTotalElements((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      handleMarkAsRead(n.notificationId);
    }
    if (n.referenceType === 'TASK' && n.referenceId) {
      navigate(`/tasks/${n.referenceId}`);
    } else if (n.referenceType === 'PROJECT' && n.referenceId) {
      navigate(`/projects/${n.referenceId}`);
    } else if (n.referenceType === 'ANNOUNCEMENT') {
      navigate('/announcements');
    }
  };

  // Client-side search filtering
  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(query) ||
      n.message?.toLowerCase().includes(query) ||
      n.notificationType?.toLowerCase().includes(query)
    );
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK':
        return <CheckSquare className="w-5 h-5 text-blue-600" />;
      case 'PROJECT':
        return <FolderKanban className="w-5 h-5 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'TASK':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROJECT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0A2240] text-white">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications & Alerts</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Stay updated with real-time alerts for tasks, project updates, and department announcements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadNotifications}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'UNREAD', label: 'Unread Only' },
            { id: 'TASK', label: 'Tasks' },
            { id: 'PROJECT', label: 'Projects' },
            { id: 'ANNOUNCEMENT', label: 'Announcements' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(0);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0A2240] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="mx-auto animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-bold">{error}</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Sparkles size={36} className="mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">No Notifications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? 'No alerts match your search query.' : 'You have no notifications in this category.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => (
              <div
                key={n.notificationId}
                onClick={() => handleNotificationClick(n)}
                className={`p-5 flex items-start justify-between gap-4 transition-all cursor-pointer hover:bg-slate-50/80 ${
                  !n.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-2xl shrink-0 mt-0.5 border ${getTypeBadgeClass(n.notificationType)}`}>
                    {getNotificationIcon(n.notificationType)}
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${getTypeBadgeClass(n.notificationType)}`}>
                        {n.notificationType}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Unread" />
                      )}
                    </div>

                    <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {n.title}
                    </h4>
                    
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {n.referenceId && (
                    <button
                      onClick={() => handleNotificationClick(n)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors"
                      title="Open Resource"
                    >
                      <ExternalLink size={14} />
                      View
                    </button>
                  )}

                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.notificationId, e)}
                      className="p-2 text-blue-600 hover:bg-blue-100/60 rounded-xl transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDelete(n.notificationId, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing page {page + 1} of {totalPages} ({totalElements} total notifications)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
