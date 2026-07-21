import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/authentication/AuthProvider';
import { notificationApi } from '../../core/api/notificationApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { Bell, CheckCheck, Trash2, X, ExternalLink, Megaphone } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', perm: null },
  { to: '/employees', label: 'Employee Directory', icon: 'groups', perm: 'EMPLOYEE_VIEW_TEAM' },
  { to: '/attendance', label: 'Attendance', icon: 'calendar_today', perm: 'ATTENDANCE_VIEW_SELF' },
  { to: '/tasks', label: 'Task Management', icon: 'assignment', perm: null },
  { to: '/projects', label: 'Projects', icon: 'tactic', perm: null },
  { to: '/announcements', label: 'Announcements', icon: 'campaign', perm: 'ANNOUNCEMENT_VIEW' },
  { to: '/calendar', label: 'Calendar', icon: 'event', perm: null },
  { to: '/reports', label: 'Reports', icon: 'assessment', perm: null },
  { to: '/admin', label: 'Administration', icon: 'admin_panel_settings', perm: null },
];

export const Layout = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notifications State
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [toastAlert, setToastAlert] = useState(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const data = await notificationApi.getNotifications({ page: 0, size: 20 });
      setNotifications(data?.content || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const toggleNotifDrawer = () => {
    const nextState = !isNotifDrawerOpen;
    setIsNotifDrawerOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  // Real-time STOMP WebSocket notification handler
  useWebSocket((newNotif) => {
    setUnreadCount((prev) => prev + 1);
    setToastAlert(newNotif);
    if (isNotifDrawerOpen) {
      setNotifications((prev) => [newNotif, ...prev]);
    }
    // Auto-dismiss toast popup after 5 seconds
    setTimeout(() => {
      setToastAlert((curr) => (curr?.notificationId === newNotif.notificationId ? null : curr));
    }, 5000);
  });

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      const target = notifications.find((n) => n.notificationId === id);
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.notificationId);
    }
    setIsNotifDrawerOpen(false);

    if (notif.referenceType === 'TASK' && notif.referenceId) {
      navigate(`/tasks/${notif.referenceId}`);
    } else if (notif.referenceType === 'PROJECT' && notif.referenceId) {
      navigate(`/projects/${notif.referenceId}`);
    } else if (notif.referenceType === 'ANNOUNCEMENT') {
      navigate('/announcements');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((i) => !i.perm || hasPermission(i.perm));

  const SidebarContent = ({ onNav }) => (
    <>
      {/* Brand */}
      <div className="px-6 mb-8 mt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-extrabold text-white text-xs">
            MS
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-none">DE-CGV4</h1>
            <p className="text-[10px] text-blue-200/70 mt-0.5">Department Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNav}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-blue-100/70 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-blue-200/60'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-2 mt-auto pt-4 border-t border-white/10">
        {user && (
          <NavLink
            to="/profile"
            onClick={onNav}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-blue-100/70 hover:bg-white/8 hover:text-white transition-all mb-0.5"
          >
            <span className="material-symbols-outlined text-[20px] text-blue-200/60">account_circle</span>
            <span className="truncate">{user.displayName || user.name}</span>
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-blue-100/70 hover:bg-white/8 hover:text-red-300 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-blue-200/60">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  const activeItem = NAV_ITEMS.find((i) => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A2240] h-screen fixed left-0 top-0 z-40 py-5 shrink-0">
        <SidebarContent onNav={undefined} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-[#0A2240] h-full py-5 z-10 shadow-2xl animate-fade-in">
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-gray-200/80 fixed top-0 left-0 right-0 md:left-64 z-30 flex items-center justify-between px-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800 text-sm hidden sm:inline">ITEA Portal</span>
              {activeItem && (
                <>
                  <span className="hidden sm:block w-px h-4 bg-gray-300" />
                  <span className="text-xs font-semibold text-gray-400">{activeItem.label}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell Notification Icon */}
            <button
              onClick={toggleNotifDrawer}
              className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full min-w-[18px] text-center shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {user && (
              <div className="flex items-center gap-2.5 pl-4 border-l border-gray-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-gray-800 leading-none">{user.displayName || user.name}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                    {(user.role || '').replace('ROLE_', '')}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#0A2240]/10 border border-[#0A2240]/20 flex items-center justify-center font-bold text-[#0A2240] text-xs select-none">
                  {(user.displayName || user.name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </div>
              </div>
            )}

            {/* Notification Dropdown Drawer */}
            {isNotifDrawerOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-xs animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-blue-600" />
                    <span className="font-bold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-extrabold text-[10px] rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotifDrawerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifLoading ? (
                    <div className="p-6 text-center text-slate-400">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-1">
                      <Bell size={24} className="mx-auto text-slate-300" />
                      <p className="font-bold text-slate-600">No notifications</p>
                      <p className="text-[11px]">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.notificationId}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                          !n.isRead ? 'bg-blue-50/40 font-semibold' : ''
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                n.notificationType === 'ANNOUNCEMENT'
                                  ? 'bg-purple-100 text-purple-700'
                                  : n.notificationType === 'TASK'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {n.notificationType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 font-bold leading-tight">{n.title}</p>
                          <p className="text-slate-600 font-normal line-clamp-2 leading-relaxed text-[11px]">
                            {n.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-1">
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.notificationId, e)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded-md"
                              title="Mark as read"
                            >
                              <CheckCheck size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotif(n.notificationId, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setIsNotifDrawerOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full py-1.5 px-3 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>View all notifications</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Real-time Toast Pop-up Notification (Upper Right Corner) */}
        {toastAlert && (
          <div className="fixed top-16 right-5 z-[9999] max-w-sm bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div className="flex-1 space-y-1 text-xs">
              <p className="font-bold text-white leading-tight">{toastAlert.title}</p>
              <p className="text-slate-300 text-[11px] line-clamp-2">{toastAlert.message}</p>
            </div>
            <button onClick={() => setToastAlert(null)} className="text-slate-400 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 mt-14 overflow-y-auto">
          <div className="w-full px-4 py-4 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
