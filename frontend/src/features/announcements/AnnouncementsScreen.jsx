import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Calendar, Clock, Tag, CheckCircle, AlertCircle, Archive, Trash2 } from 'lucide-react';
import { announcementApi } from '../../core/api/announcementApi';
import { useAuth } from '../../features/authentication/AuthProvider';
import CreateAnnouncementModal from './CreateAnnouncementModal';

export default function AnnouncementsScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('ANNOUNCEMENT_CREATE');
  const canPublish = hasPermission('ANNOUNCEMENT_PUBLISH');
  const canArchive = hasPermission('ANNOUNCEMENT_ARCHIVE');
  const canDelete = hasPermission('ANNOUNCEMENT_DELETE');

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, [statusFilter]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await announcementApi.getAnnouncements({ status: statusFilter, page: 0, size: 50 });
      setAnnouncements(data?.content || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await announcementApi.publish(id);
      setActionMessage('Announcement published successfully!');
      loadAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleArchive = async (id) => {
    try {
      await announcementApi.archive(id);
      setActionMessage('Announcement archived.');
      loadAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementApi.delete(id);
      setActionMessage('Announcement deleted.');
      loadAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4 animate-fade-in text-xs">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold">
            <Megaphone size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">System Announcements</h1>
            <p className="text-slate-500">Official department & portal broadcasts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} /> Create Announcement
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold text-emerald-900">Dismiss</button>
        </div>
      )}

      {/* Admin Status Filter Tabs */}
      {canCreate && (
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {['', 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'EXPIRED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === '' ? 'All Status' : st}
            </button>
          ))}
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 space-y-2">
          <Megaphone size={32} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-600 text-sm">No announcements found</p>
          <p className="text-slate-400">There are currently no broadcast announcements published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.map((item) => (
            <div
              key={item.announcementId}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden"
            >
              {/* Priority Accent Bar */}
              <div
                className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  item.priority === 'HIGH'
                    ? 'bg-rose-500'
                    : item.priority === 'MEDIUM'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />

              <div className="pl-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        item.priority === 'HIGH'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : item.priority === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}
                    >
                      {item.priority} Priority
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        item.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : item.status === 'SCHEDULED'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleString()
                      : new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs">{item.message}</p>

                {/* Admin Quick Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                  <div className="text-slate-400 flex items-center gap-3">
                    {item.publishFrom && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> From: {new Date(item.publishFrom).toLocaleString()}
                      </span>
                    )}
                    {item.publishUntil && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Until: {new Date(item.publishUntil).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canPublish && item.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(item.announcementId)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        Publish Now
                      </button>
                    )}
                    {canArchive && item.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchive(item.announcementId)}
                        className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Archive size={12} /> Archive
                      </button>
                    )}
                    {canDelete && (item.status === 'DRAFT' || item.status === 'ARCHIVED') && (
                      <button
                        onClick={() => handleDelete(item.announcementId)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAnnouncementCreated={() => {
          setActionMessage('Announcement created successfully!');
          loadAnnouncements();
        }}
      />
    </div>
  );
}
