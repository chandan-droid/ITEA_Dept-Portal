import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Megaphone, Calendar, AlertTriangle } from 'lucide-react';
import { announcementApi } from '../../core/api/announcementApi';

export default function CreateAnnouncementModal({ isOpen, onClose, onAnnouncementCreated }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [publishAction, setPublishAction] = useState('DRAFT'); // DRAFT, PUBLISH, SCHEDULE
  const [publishFrom, setPublishFrom] = useState('');
  const [publishUntil, setPublishUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Draft
      const announcement = await announcementApi.create({
        title: title.trim(),
        message: message.trim(),
        priority,
        publishFrom: publishFrom ? new Date(publishFrom).toISOString() : null,
        publishUntil: publishUntil ? new Date(publishUntil).toISOString() : null,
      });

      // 2. Perform requested action (PUBLISH or SCHEDULE if selected)
      if (publishAction === 'PUBLISH') {
        await announcementApi.publish(announcement.announcementId);
      } else if (publishAction === 'SCHEDULE' && publishFrom) {
        await announcementApi.schedule(announcement.announcementId, {
          publishFrom: new Date(publishFrom).toISOString(),
          publishUntil: publishUntil ? new Date(publishUntil).toISOString() : null,
        });
      }

      onAnnouncementCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process announcement.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Create System Announcement</h2>
              <p className="text-xs text-slate-500">Publish broadcast alerts to all portal users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">Announcement Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Scheduled System Maintenance Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl font-bold border transition-all ${
                    priority === p
                      ? p === 'HIGH'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : p === 'MEDIUM'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-blue-500 text-white border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Announcement Message *</label>
            <textarea
              rows={4}
              required
              placeholder="Detailed announcement details..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Action Lifecycle</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPublishAction('DRAFT')}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  publishAction === 'DRAFT'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => setPublishAction('PUBLISH')}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  publishAction === 'PUBLISH'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => setPublishAction('SCHEDULE')}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  publishAction === 'SCHEDULE'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Schedule
              </button>
            </div>
          </div>

          {publishAction === 'SCHEDULE' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Publish From *</label>
                <input
                  type="datetime-local"
                  required
                  value={publishFrom}
                  onChange={(e) => setPublishFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Publish Until (Optional)</label>
                <input
                  type="datetime-local"
                  value={publishUntil}
                  onChange={(e) => setPublishUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Processing...' : publishAction === 'PUBLISH' ? 'Publish Announcement' : publishAction === 'SCHEDULE' ? 'Schedule Announcement' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
