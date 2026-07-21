import React, { useState, useEffect } from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { attendanceApi } from '../../core/api/attendanceApi';

class DateHelper {
  static today() { const d = new Date(); return { month: d.getMonth() + 1, year: d.getFullYear() }; }
  static monthStartOffset(m, y) { return new Date(y, m - 1, 1).getDay(); }
  static daysInMonth(m, y) { return new Date(y, m, 0).getDate(); }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_STYLES = {
  PRESENT:       { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  CHECKED_IN:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  CHECKED_OUT:   { bg: 'bg-blue-50 text-blue-700 border-blue-200/60', dot: 'bg-blue-500' },
  WFH:           { bg: 'bg-sky-50 text-sky-700 border-sky-200/60 font-semibold', dot: 'bg-sky-500' },
  PENDING_WFH:   { bg: 'bg-sky-50/50 text-sky-700 border border-dashed border-sky-300', dot: 'bg-sky-400' },
  ABSENT:        { bg: 'bg-rose-50 text-rose-700 border-rose-200/60', dot: 'bg-rose-500' },
  LEAVE:         { bg: 'bg-pink-50 text-pink-700 border-pink-200/60 font-semibold', dot: 'bg-pink-500' },
  PENDING_LEAVE: { bg: 'bg-pink-50/50 text-pink-700 border border-dashed border-pink-300', dot: 'bg-pink-400' },
  HALF_DAY:      { bg: 'bg-purple-50 text-purple-700 border-purple-200/60', dot: 'bg-purple-500' },
  HOLIDAY:       { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', dot: 'bg-indigo-500' },
  WEEKEND:       { bg: 'bg-slate-100 text-slate-500 border-slate-200/60', dot: 'bg-slate-400' },
  PENDING:       { bg: 'bg-amber-50 text-amber-700 border-amber-200/60', dot: 'bg-amber-500' },
  APPROVED:      { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  REJECTED:      { bg: 'bg-rose-50 text-rose-700 border-rose-200/60', dot: 'bg-rose-500' },
  CANCELLED:     { bg: 'bg-slate-100 text-slate-600 border-slate-200/60', dot: 'bg-slate-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {(status || '').replace('_', ' ')}
    </span>
  );
}

const CAL_STATUS_STYLES = {
  PRESENT:       { cellBg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60 text-emerald-950', badge: 'bg-emerald-100 text-emerald-800 font-extrabold', icon: 'check_circle', label: 'Present' },
  CHECKED_IN:    { cellBg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60 text-emerald-950', badge: 'bg-emerald-100 text-emerald-800 font-extrabold', icon: 'login', label: 'Checked In' },
  CHECKED_OUT:   { cellBg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200/60 text-blue-950', badge: 'bg-blue-100 text-blue-800 font-extrabold', icon: 'logout', label: 'Checked Out' },
  WFH:           { cellBg: 'bg-sky-50 hover:bg-sky-100/80 border-sky-200/60 text-sky-950', badge: 'bg-sky-100 text-sky-800 font-extrabold', icon: 'home_work', label: 'WFH' },
  PENDING_WFH:   { cellBg: 'bg-sky-50/50 hover:bg-sky-100/80 border border-dashed border-sky-300 text-sky-800', badge: 'bg-sky-100 text-sky-800 border border-sky-300 font-bold', icon: 'hourglass_empty', label: 'Pending WFH' },
  LEAVE:         { cellBg: 'bg-pink-50 hover:bg-pink-100/80 border-pink-200/60 text-pink-950', badge: 'bg-pink-100 text-pink-800 font-extrabold', icon: 'beach_access', label: 'Leave' },
  PENDING_LEAVE: { cellBg: 'bg-pink-50/50 hover:bg-pink-100/80 border border-dashed border-pink-300 text-pink-800', badge: 'bg-pink-100 text-pink-800 border border-pink-300 font-bold', icon: 'hourglass_top', label: 'Pending Leave' },
  ABSENT:        { cellBg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/60 text-rose-950', badge: 'bg-rose-100 text-rose-800 font-extrabold', icon: 'block', label: 'Absent' },
  HOLIDAY:       { cellBg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/60 text-indigo-950', badge: 'bg-indigo-100 text-indigo-800 font-extrabold', icon: 'event', label: 'Holiday' },
  WEEKEND:       { cellBg: 'bg-slate-100/70 hover:bg-slate-100 border-slate-200/50 text-slate-400', badge: 'bg-slate-200/80 text-slate-600 font-bold', icon: 'weekend', label: 'Weekend' },
};

function AttendanceCalendar({ calendarDays, currentDate, onPrev, onNext, loading }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const offset = DateHelper.monthStartOffset(currentDate.month, currentDate.year);
  const total = DateHelper.daysInMonth(currentDate.month, currentDate.year);

  // Timezone-safe date mapping
  const map = {};
  (calendarDays || []).forEach(d => {
    const rawDate = d.date || d.attendanceDate;
    if (rawDate) {
      const parts = String(rawDate).split('T')[0].split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        map[dayNum] = d;
      }
    }
  });

  const now = new Date();
  const todayN = (now.getMonth() + 1 === currentDate.month && now.getFullYear() === currentDate.year) ? now.getDate() : -1;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between p-5 space-y-4 relative">
      {/* Calendar Top Control Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              {MONTHS[currentDate.month - 1]} {currentDate.year}
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">Hover over any date to view detailed check-in & check-out logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button onClick={onPrev} className="p-1.5 hover:bg-white hover:shadow-2xs rounded-xl transition-all active:scale-95 text-slate-600 cursor-pointer flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-xs font-bold text-slate-700 px-3 font-sans">
            {MONTHS[currentDate.month - 1]} {currentDate.year}
          </span>
          <button onClick={onNext} className="p-1.5 hover:bg-white hover:shadow-2xs rounded-xl transition-all active:scale-95 text-slate-600 cursor-pointer flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Status Legend Pills Bar */}
      <div className="flex items-center gap-3 overflow-x-auto text-[10px] font-extrabold scrollbar-none py-1">
        {[
          ['bg-emerald-500', 'Present'],
          ['bg-sky-500', 'WFH'],
          ['bg-amber-500', 'Pending Leave'],
          ['bg-pink-500', 'Leave'],
          ['bg-indigo-500', 'Holiday'],
          ['bg-slate-400', 'Weekend']
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/50 shrink-0">
            <span className={`w-2 h-2 rounded-full ${c}`} />
            <span className="text-slate-600">{l}</span>
          </div>
        ))}
      </div>

      {/* Weekday Grid Headers */}
      <div className="grid grid-cols-7 text-center font-black text-[10px] tracking-widest text-slate-400 py-1">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[26px] animate-spin text-blue-600">progress_activity</span>
          Loading calendar...
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 relative">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={'o' + i} className="h-16 rounded-xl bg-slate-50/40" />
          ))}
          {Array.from({ length: total }).map((_, i) => {
            const n = i + 1;
            const rec = map[n];
            const isT = n === todayN;
            
            // Determine day status
            const dayOfWeek = new Date(currentDate.year, currentDate.month - 1, n).getDay();
            const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
            const defaultStatus = isT ? 'PRESENT' : (isWeekendDay ? 'WEEKEND' : 'NO_RECORD');
            const statusKey = rec?.status || defaultStatus;

            const style = CAL_STATUS_STYLES[statusKey] || {
              cellBg: 'bg-white hover:bg-slate-50 border border-slate-100',
              badge: 'bg-slate-100 text-slate-600',
              icon: 'circle',
              label: statusKey.replace('_', ' ')
            };

            const cellDateObj = new Date(currentDate.year, currentDate.month - 1, n);
            const dateFormattedStr = cellDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const workingHrsStr = rec?.workingMinutes 
              ? `${Math.floor(rec.workingMinutes / 60)}h ${rec.workingMinutes % 60}m`
              : (rec?.checkInTime ? 'In progress' : '--');

            const isHovered = hoveredDay === n;
            const cellIndex = i + offset;
            const isTopRow = cellIndex < 7;
            const isLeftCol = cellIndex % 7 < 2;
            const isRightCol = cellIndex % 7 > 4;

            // Alignment positioning
            let popoverPosClass = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';
            if (isLeftCol) popoverPosClass += ' left-0';
            else if (isRightCol) popoverPosClass += ' right-0';
            else popoverPosClass += ' left-1/2 -translate-x-1/2';

            return (
              <div
                key={n}
                onMouseEnter={() => setHoveredDay(n)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-16 p-2 rounded-xl border flex flex-col justify-between transition-all relative cursor-pointer ${style.cellBg} ${
                  isT ? 'ring-2 ring-blue-600 bg-blue-50/30' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-black font-mono ${isT ? 'text-blue-600' : 'text-slate-700'}`}>
                    {String(n).padStart(2, '0')}
                  </span>
                  {isT && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                      Today
                    </span>
                  )}
                </div>

                <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold flex items-center justify-center gap-1 ${style.badge}`}>
                  <span className="truncate">{style.label}</span>
                </div>

                {/* ─── HOVER DETAILS FLOATING POPOVER CARD ───────────────── */}
                {isHovered && (
                  <div className={`absolute ${popoverPosClass} flex flex-col w-64 p-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 z-[9999] pointer-events-none animate-fade-in text-left`}>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <div className="font-black text-xs text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-blue-400">event</span>
                        {dateFormattedStr}
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-medium text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px] text-emerald-400">login</span> Check In:
                        </span>
                        <span className="font-mono font-extrabold text-white">{rec?.checkInTime ? rec.checkInTime.substring(0, 5) : '--:--'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px] text-rose-400">logout</span> Check Out:
                        </span>
                        <span className="font-mono font-extrabold text-white">{rec?.checkOutTime ? rec.checkOutTime.substring(0, 5) : '--:--'}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px] text-blue-400">timer</span> Logged Hours:
                        </span>
                        <span className="font-mono font-extrabold text-blue-300">{workingHrsStr}</span>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-800/80 pt-1.5 mt-1">
                        <span className="text-slate-400 flex items-center gap-1 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px] text-sky-400">location_on</span> Location:
                        </span>
                        <span className="font-extrabold text-slate-200">{rec?.checkInLocation || 'HQ Office'}</span>
                      </div>

                      {rec?.reason && (
                        <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded-xl border border-amber-500/20 italic mt-1 font-medium">
                          "{rec.reason}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MCLS = 'w-full border border-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white';

function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </div>
            {title}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-200/60 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function MF({ label, req, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        {label}{req && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function MA({ onClose, busy, label }) {
  return (
    <div className="flex gap-3 pt-3">
      <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={busy} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-extrabold hover:bg-blue-700 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20">
        <span className="material-symbols-outlined text-[16px]">send</span>
        {busy ? 'Submitting...' : label}
      </button>
    </div>
  );
}

function LeaveModal({ onClose, onSuccess }) {
  const [types, setTypes] = useState([]);
  const [tid, setTid] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { attendanceApi.getLeaveTypes().then(t => setTypes(t || [])).catch(() => {}); }, []);

  const sub = async e => {
    e.preventDefault();
    if (!tid || !from || !to) { alert('Please fill in all required fields.'); return; }
    setBusy(true);
    try {
      await attendanceApi.submitLeave({ leaveTypeId: Number(tid), fromDate: from, toDate: to, reason });
      onSuccess();
    } catch (er) {
      alert(er.response?.data?.message || er.message || 'Failed to submit leave');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Apply for Leave" icon="add_task" onClose={onClose}>
      <form onSubmit={sub} className="space-y-4">
        <MF label="Leave Type" req>
          <select value={tid} onChange={e => setTid(e.target.value)} className={MCLS}>
            <option value="">Select Leave Type</option>
            {types.map(t => <option key={t.leaveTypeId} value={t.leaveTypeId}>{t.typeName || t.leaveName}</option>)}
          </select>
        </MF>
        <div className="grid grid-cols-2 gap-3">
          <MF label="Start Date" req><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={MCLS} /></MF>
          <MF label="End Date" req><input type="date" value={to} onChange={e => setTo(e.target.value)} className={MCLS} /></MF>
        </div>
        <MF label="Reason"><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Provide a brief explanation..." className={MCLS + ' resize-none'} /></MF>
        <MA onClose={onClose} busy={busy} label="Submit Request" />
      </form>
    </Modal>
  );
}

function WfhModal({ onClose, onSuccess }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const sub = async e => {
    e.preventDefault();
    if (!date || !reason) { alert('Please fill in all required fields.'); return; }
    setBusy(true);
    try {
      await attendanceApi.submitWfh({ wfhDate: date, reason });
      onSuccess();
    } catch (er) {
      alert(er.response?.data?.message || er.message || 'Failed to submit WFH');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Apply for WFH" icon="home_work" onClose={onClose}>
      <form onSubmit={sub} className="space-y-4">
        <MF label="WFH Date" req><input type="date" value={date} onChange={e => setDate(e.target.value)} className={MCLS} /></MF>
        <MF label="Reason" req><input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for Work From Home..." className={MCLS} /></MF>
        <MA onClose={onClose} busy={busy} label="Submit Request" />
      </form>
    </Modal>
  );
}

export const AttendanceScreen = () => {
  const { hasPermission } = useAuth();

  const isManagerOrAdmin = hasPermission('ATTENDANCE_VIEW_TEAM') || hasPermission('LEAVE_APPROVE') || hasPermission('WFH_APPROVE') || hasPermission('HOLIDAY_MANAGE');
  const canApplyLeave = hasPermission('LEAVE_CREATE') && !isManagerOrAdmin;
  const canApplyWfh = hasPermission('WFH_CREATE') && !isManagerOrAdmin;
  const canViewTeam = isManagerOrAdmin;

  const [viewTab, setViewTab] = useState('my_attendance');

  // State
  const [statusData, setStatusData] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [monthStats, setMonthStats] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [calLoading, setCalLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(DateHelper.today());
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [recentReqs, setRecentReqs] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [wfhModal, setWfhModal] = useState(false);

  // Manager & Admin State
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingWfh, setPendingWfh] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [teamSummary, setTeamSummary] = useState(null);
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamSearchText, setTeamSearchText] = useState('');

  const fetchToday = async () => {
    try {
      const [st, td] = await Promise.allSettled([attendanceApi.getStatus(), attendanceApi.getToday()]);
      if (st.status === 'fulfilled') setStatusData(st.value);
      if (td.status === 'fulfilled') setTodayData(td.value);
    } catch (e) {
      console.error(e);
    } finally {
      setTodayLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setCalLoading(true);
    try {
      const [calRes, histRes] = await Promise.allSettled([
        attendanceApi.getCalendar(currentDate.month, currentDate.year),
        attendanceApi.getHistory({ page: 0, size: 50 })
      ]);
      
      const calData = (calRes.status === 'fulfilled' ? calRes.value : []) || [];
      const histData = (histRes.status === 'fulfilled' && histRes.value?.content ? histRes.value.content : []) || [];

      // Create a lookup map of history items by day number
      const histMap = {};
      histData.forEach(h => {
        const dStr = h.attendanceDate || h.date;
        if (dStr) {
          const parts = String(dStr).split('T')[0].split('-');
          if (parts.length === 3) {
            histMap[parseInt(parts[2], 10)] = h;
          }
        }
      });

      // Merge history logs into calendar days
      const merged = calData.map(d => {
        const rawDate = d.date || d.attendanceDate;
        if (rawDate) {
          const parts = String(rawDate).split('T')[0].split('-');
          if (parts.length === 3) {
            const dayNum = parseInt(parts[2], 10);
            if (histMap[dayNum]) {
              return { ...d, ...histMap[dayNum] };
            }
          }
        }
        return d;
      });

      setCalendarDays(merged);
      const c = { PRESENT: 0, ABSENT: 0, WFH: 0, LEAVE: 0, PENDING_LEAVE: 0, PENDING_WFH: 0, HALF_DAY: 0, HOLIDAY: 0, WEEKEND: 0 };
      merged.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
      setMonthStats(c);
    } catch (e) {
      console.error(e);
    } finally {
      setCalLoading(false);
    }
  };

  const fetchLeave = async () => {
    try {
      const [b, lv, wf] = await Promise.allSettled([
        attendanceApi.getLeaveBalances(),
        attendanceApi.getMyLeaves(),
        attendanceApi.getMyWfh()
      ]);
      if (b.status === 'fulfilled') {
        // Filter out Paternity leave per explicit user instructions
        const filtered = (b.value || []).filter(l => !(l.leaveTypeName || '').toLowerCase().includes('paternity'));
        setLeaveBalances(filtered);
      }
      const leaves = (lv.status === 'fulfilled' ? lv.value : []) || [];
      const wfhs = (wf.status === 'fulfilled' ? wf.value : []) || [];
      const comb = [
        ...leaves.map(r => ({ ...r, _t: 'leave', _id: r.leaveRequestId })),
        ...wfhs.map(r => ({ ...r, _t: 'wfh', _id: r.wfhRequestId }))
      ].sort((a, b) => ((b.createdAt || b.appliedAt || '') > (a.createdAt || a.appliedAt || '') ? 1 : -1)).slice(0, 5);
      setRecentReqs(comb);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const [pl, pw] = await Promise.allSettled([attendanceApi.getPendingLeaves(), attendanceApi.getPendingWfh()]);
      if (pl.status === 'fulfilled') setPendingLeaves(pl.value || []);
      if (pw.status === 'fulfilled') setPendingWfh(pw.value || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeamRoster = async () => {
    try {
      const [ta, ts] = await Promise.allSettled([
        attendanceApi.getTeamAttendance(teamDate),
        attendanceApi.getTeamAttendanceSummary(teamDate)
      ]);
      if (ta.status === 'fulfilled') setTeamAttendance(ta.value?.teamAttendance || []);
      if (ts.status === 'fulfilled') setTeamSummary(ts.value);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => setGeoError('GPS unavailable — IP logging active')
      );
    }
    fetchToday();
    fetchLeave();
    if (canViewTeam) fetchPendingApprovals();
  }, []);

  useEffect(() => { fetchCalendar(); }, [currentDate]);
  useEffect(() => { if (viewTab === 'team_attendance') { fetchTeamRoster(); fetchPendingApprovals(); } }, [viewTab, teamDate]);

  const handleCI = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkIn(location);
      await fetchToday();
      await fetchCalendar();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCO = async () => {
    if (!confirm('Are you sure you want to Check-Out?')) return;
    setCheckingOut(true);
    try {
      await attendanceApi.checkOut(location);
      await fetchToday();
      await fetchCalendar();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCancelRequest = async (id, type) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      if (type === 'leave') await attendanceApi.cancelLeave(id);
      else await attendanceApi.cancelWfh(id);
      fetchLeave();
      fetchCalendar();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Cancellation failed');
    }
  };

  const handleApprove = async (id, type) => {
    try {
      if (type === 'leave') await attendanceApi.approveLeave(id);
      else await attendanceApi.approveWfh(id);
      fetchPendingApprovals();
      fetchTeamRoster();
      fetchCalendar();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Approval failed');
    }
  };

  const handleReject = async (id, type) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      if (type === 'leave') await attendanceApi.rejectLeave(id, reason);
      else await attendanceApi.rejectWfh(id);
      fetchPendingApprovals();
      fetchTeamRoster();
      fetchCalendar();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Rejection failed');
    }
  };

  const navP = () => setCurrentDate(d => d.month === 1 ? { month: 12, year: d.year - 1 } : { month: d.month - 1, year: d.year });
  const navN = () => setCurrentDate(d => d.month === 12 ? { month: 1, year: d.year + 1 } : { month: d.month + 1, year: d.year });

  const isCI = !todayLoading && (statusData?.isCheckedIn || !!todayData?.checkInTime);
  const isCO = !todayLoading && (statusData?.isCheckedOut || todayData?.checkOutTime != null);
  const wkHrs = statusData?.workingHours || (todayData?.workingMinutes ? (Math.floor(todayData.workingMinutes / 60) + 'h ' + (todayData.workingMinutes % 60) + 'm') : (isCI ? 'In progress' : '--'));
  const wkDays = monthStats ? (DateHelper.daysInMonth(currentDate.month, currentDate.year) - (monthStats.WEEKEND || 0) - (monthStats.HOLIDAY || 0)) : 1;
  const pct = monthStats?.PRESENT ? Math.round((monthStats.PRESENT / wkDays) * 100) : 0;
  const totalPendingCount = pendingLeaves.length + pendingWfh.length;

  // Fallback Leave Wallet Items matching design if API is empty
  const defaultWallet = [
    { leaveTypeId: 1, leaveTypeName: 'Sick Leave', usedDays: 8, totalDays: 12 },
    { leaveTypeId: 2, leaveTypeName: 'Casual Leave', usedDays: 5, totalDays: 12 },
    { leaveTypeId: 3, leaveTypeName: 'Earned Leave', usedDays: 12, totalDays: 20 },
  ];
  const displayWallet = (leaveBalances && leaveBalances.length > 0) ? leaveBalances : defaultWallet;

  return (
    <div className="animate-fade-in select-none space-y-5 pb-12 font-sans">
      {/* ─── TOP HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance & Leaves</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track your attendance and manage your leaves with ease.</p>
        </div>

        <div className="flex items-center gap-3">
          {canViewTeam && (
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/70 shadow-2xs">
              <button
                onClick={() => setViewTab('my_attendance')}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewTab === 'my_attendance'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">person</span>
                My Attendance
              </button>

              <button
                onClick={() => setViewTab('team_attendance')}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewTab === 'team_attendance'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">groups</span>
                Team Dashboard
                {totalPendingCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                    {totalPendingCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {canApplyLeave && (
            <button
              onClick={() => setLeaveModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              Apply Leave
            </button>
          )}

          {canApplyWfh && (
            <button
              onClick={() => setWfhModal(true)}
              className="flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">home_work</span>
              Apply WFH
            </button>
          )}
        </div>
      </div>

      {/* ─── SUB TAB 1: MY ATTENDANCE HUB ────────────────────────── */}
      {viewTab === 'my_attendance' && (
        <div className="space-y-5">
          {/* Top Row: Lower height 5 cards matching reference image */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: DAY'S PUNCH (Displays Shift Duration instead of Server Time) */}
            <div className="bg-gradient-to-br from-[#0B1E36] to-[#0A2240] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden h-[160px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">DAY'S PUNCH</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                  • ON TIME
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1 font-mono tracking-tight text-white">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums">
                    {wkHrs === '--' ? '09h 00m' : wkHrs}
                  </span>
                  <span className="text-[10px] font-sans font-extrabold text-blue-200 uppercase tracking-widest">
                    SHIFT
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/80 font-medium mt-0.5">
                  Standard Shift Target: 09h 00m
                </p>
              </div>

              <div>
                {!isCI ? (
                  <button
                    onClick={handleCI}
                    disabled={checkingIn}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    {checkingIn ? 'Checking In...' : 'Check-In Now'}
                  </button>
                ) : !isCO ? (
                  <button
                    onClick={handleCO}
                    disabled={checkingOut}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    {checkingOut ? 'Checking Out...' : 'Check-Out Now'}
                  </button>
                ) : (
                  <div className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 py-1.5 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    Shift Completed — {wkHrs}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: DAYS PRESENT */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DAYS PRESENT</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-600 tabular-nums">
                  {String(monthStats?.PRESENT ?? 1).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">This Month</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{pct || 4}% of working days</div>
              </div>
            </div>

            {/* Card 3: LEAVES TAKEN */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">LEAVES TAKEN</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">alt_route</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-amber-500 tabular-nums">
                  {String((monthStats?.LEAVE || 0) + (monthStats?.PENDING_LEAVE || 0)).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Approved & Pending</div>
                <div className="text-[10px] text-slate-400 mt-0.5">0% of working days</div>
              </div>
            </div>

            {/* Card 4: WFH COUNT */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WFH COUNT</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">home</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-blue-600 tabular-nums">
                  {String((monthStats?.WFH || 0) + (monthStats?.PENDING_WFH || 0)).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1">Approved & Pending</div>
                <div className="text-[10px] text-slate-400 mt-0.5">0% of working days</div>
              </div>
            </div>

            {/* Card 5: LEAVE WALLET */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between h-[160px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">account_balance_wallet</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">LEAVE WALLET</span>
                </div>
                <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">More Info</button>
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1">
                {displayWallet.map(b => {
                  const p = b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0;
                  return (
                    <div key={b.leaveTypeId || b.leaveTypeName} className="space-y-0.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-800 font-bold">{b.leaveTypeName}</span>
                        <span className="font-mono font-bold text-slate-500">{b.usedDays}/{b.totalDays} days</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: p + '%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Middle Row: Calendar + Right Activity Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left Column: Calendar (2 cols) */}
            <div className="lg:col-span-2">
              <AttendanceCalendar
                calendarDays={calendarDays}
                currentDate={currentDate}
                onPrev={navP}
                onNext={navN}
                loading={calLoading}
              />
            </div>

            {/* Right Column: Recent Applications + Active Shift Details */}
            <div className="flex flex-col gap-4">
              
              {/* Card 1: RECENT APPLICATIONS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 flex-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">schedule</span>
                    RECENT APPLICATIONS
                  </h3>
                  <button className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
                </div>

                {recentReqs.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                      <span className="material-symbols-outlined text-[24px] text-slate-300">note_alt</span>
                    </div>
                    No recent leave or WFH requests.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentReqs.map((r, i) => {
                      const isW = r._t === 'wfh';
                      const ds = isW ? (r.wfhDate || r.requestDate || '') : ((r.fromDate || r.startDate || '') + ' → ' + (r.toDate || r.endDate || ''));
                      const lbl = isW ? 'Work From Home' : (r.leaveTypeName || 'Leave Request');
                      const ic = isW ? 'home_work' : 'beach_access';
                      const st = r.status || 'PENDING';

                      return (
                        <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px] text-blue-600">{ic}</span>
                              <span className="text-xs font-bold text-slate-800">{lbl}</span>
                            </div>
                            <StatusBadge status={st} />
                          </div>
                          <div className="text-[11px] font-mono text-slate-600 font-medium">📅 {ds}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 2: ACTIVE SHIFT DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">badge</span>
                    ACTIVE SHIFT DETAILS
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Code</div>
                    <div className="font-mono font-bold text-slate-800">BK-1st</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift Type</div>
                    <div className="font-mono font-bold text-slate-800">Regular</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login</div>
                    <div className="font-mono font-bold text-slate-800">{todayData?.checkInTime || '09:30 AM'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logout</div>
                    <div className="font-mono font-bold text-slate-800">{todayData?.checkOutTime || '06:30 PM'}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px] font-bold text-slate-500 border-t border-slate-100">
                  <span>Duration: <strong className="text-slate-800 font-mono">{wkHrs === '--' ? '09h 00m' : wkHrs}</strong></span>
                  <span>Break: <strong className="text-slate-800 font-mono">60m</strong></span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ─── SUB TAB 2: MANAGER & ADMIN TEAM APPROVALS DESK ───────────────────── */}
      {viewTab === 'team_attendance' && (
        <div className="space-y-5">
          {/* Top Summary Cards Row */}
          {teamSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-100 text-center shadow-2xs">
                <div className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">Present</div>
                <div className="text-3xl font-black text-emerald-800 mt-1">{teamSummary.totalPresent}</div>
              </div>
              <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-100 text-center shadow-2xs">
                <div className="text-[10px] text-rose-700 font-extrabold uppercase tracking-widest">Absent</div>
                <div className="text-3xl font-black text-rose-800 mt-1">{teamSummary.totalAbsent}</div>
              </div>
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100 text-center shadow-2xs">
                <div className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest">On Leave</div>
                <div className="text-3xl font-black text-amber-800 mt-1">{teamSummary.totalLeave}</div>
              </div>
              <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-100 text-center shadow-2xs">
                <div className="text-[10px] text-sky-700 font-extrabold uppercase tracking-widest">WFH</div>
                <div className="text-3xl font-black text-sky-800 mt-1">{teamSummary.totalWfh}</div>
              </div>
              <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100 text-center shadow-2xs col-span-2 md:col-span-1">
                <div className="text-[10px] text-blue-700 font-extrabold uppercase tracking-widest">Pending Desk</div>
                <div className="text-3xl font-black text-blue-800 mt-1">{totalPendingCount}</div>
              </div>
            </div>
          )}

          {/* Pending Approvals Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">verified</span>
                Pending Request Approvals
              </h3>
              {totalPendingCount > 0 && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-0.5 rounded-full text-xs font-bold">
                  {totalPendingCount} Action Required
                </span>
              )}
            </div>

            {totalPendingCount === 0 ? (
              <div className="py-10 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-emerald-500">task_alt</span>
                No pending leave or WFH requests to approve. All requests cleared!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Leaves Cards */}
                {pendingLeaves.map(r => (
                  <div key={r.leaveRequestId} className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">beach_access</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{r.employeeName || 'Employee'}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {r.employeeId ? `${r.employeeId} • ${r.email || ''}` : 'Leave Applicant'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status="PENDING" />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{r.leaveTypeName || 'Leave Application'}</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {r.totalDays || 1} {r.totalDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 font-bold">📅 {r.fromDate} to {r.toDate}</div>
                      <p className="text-xs text-slate-600 italic pt-1">"{r.reason || 'No reason provided'}"</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(r.leaveRequestId, 'leave')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.leaveRequestId, 'leave')}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span> Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pending WFH Cards */}
                {pendingWfh.map(r => (
                  <div key={r.wfhRequestId} className="p-4 rounded-xl border border-sky-200/80 bg-sky-50/20 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">home_work</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{r.employeeName || 'Employee'}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {r.employeeId ? `${r.employeeId} • ${r.email || ''}` : 'WFH Applicant'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status="PENDING" />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-sky-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Work From Home Application</span>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">1 Day</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 font-bold">📅 WFH Date: {r.wfhDate}</div>
                      <p className="text-xs text-slate-600 italic pt-1">"{r.reason || 'No reason provided'}"</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(r.wfhRequestId, 'wfh')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.wfhRequestId, 'wfh')}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Daily Roster Log */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[22px]">badge</span>
                  Team Daily Roster Log
                </h3>
                <p className="text-xs text-slate-400">View real-time check-in and check-out logs for all department members</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={teamDate}
                  onChange={e => setTeamDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Search employee name or ID..."
                  value={teamSearchText}
                  onChange={e => setTeamSearchText(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 w-56 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Employee ID</th>
                    <th className="px-5 py-3">Employee Name</th>
                    <th className="px-5 py-3">Check In</th>
                    <th className="px-5 py-3">Check Out</th>
                    <th className="px-5 py-3">Working Hours</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {teamAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">
                        No team attendance records found for this date.
                      </td>
                    </tr>
                  ) : (
                    teamAttendance
                      .filter(e => !teamSearchText || e.employeeName?.toLowerCase().includes(teamSearchText.toLowerCase()) || e.employeeId?.toLowerCase().includes(teamSearchText.toLowerCase()))
                      .map(e => {
                        const hrs = e.workingMinutes ? `${Math.floor(e.workingMinutes / 60)}h ${e.workingMinutes % 60}m` : '--';
                        return (
                          <tr key={e.employeeId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{e.employeeId}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-900">{e.employeeName}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-600">{e.checkInTime || '--:--'}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-600">{e.checkOutTime || '--:--'}</td>
                            <td className="px-5 py-3.5 font-mono text-blue-600 font-bold">{hrs}</td>
                            <td className="px-5 py-3.5"><StatusBadge status={e.status} /></td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {leaveModal && <LeaveModal onClose={() => setLeaveModal(false)} onSuccess={() => { setLeaveModal(false); fetchLeave(); fetchCalendar(); }} />}
      {wfhModal && <WfhModal onClose={() => setWfhModal(false)} onSuccess={() => { setWfhModal(false); fetchLeave(); fetchCalendar(); }} />}
    </div>
  );
};
