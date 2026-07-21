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
  PRESENT:       { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600' },
  CHECKED_IN:    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
  CHECKED_OUT:   { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600' },
  WFH:           { bg: 'bg-sky-50 text-sky-700 font-bold border-sky-200', dot: 'bg-sky-600' },
  PENDING_WFH:   { bg: 'bg-sky-50 text-sky-700 border border-dashed border-sky-300', dot: 'bg-sky-400' },
  ABSENT:        { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  LEAVE:         { bg: 'bg-amber-50 text-amber-700 font-bold border-amber-200', dot: 'bg-amber-500' },
  PENDING_LEAVE: { bg: 'bg-amber-50 text-amber-700 border border-dashed border-amber-300', dot: 'bg-amber-400' },
  HALF_DAY:      { bg: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-500' },
  HOLIDAY:       { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  WEEKEND:       { bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  PENDING:       { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  APPROVED:      { bg: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  REJECTED:      { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  CANCELLED:     { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{(status || '').replace('_', ' ')}
    </span>
  );
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <span className="font-mono tabular-nums text-3xl font-bold tracking-widest">{t.toLocaleTimeString('en-GB')}</span>;
}

const CAL_STATUS_STYLES = {
  PRESENT:       { cellBg: 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/80', text: 'text-emerald-800', badge: 'bg-emerald-600 text-white', icon: 'check_circle', label: 'Present' },
  CHECKED_IN:    { cellBg: 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/80', text: 'text-emerald-800', badge: 'bg-emerald-600 text-white', icon: 'login', label: 'Checked In' },
  CHECKED_OUT:   { cellBg: 'bg-blue-50/70 hover:bg-blue-100/80 border-blue-200/80', text: 'text-blue-800', badge: 'bg-blue-600 text-white', icon: 'logout', label: 'Checked Out' },
  WFH:           { cellBg: 'bg-sky-50/80 hover:bg-sky-100/90 border-sky-200', text: 'text-sky-800', badge: 'bg-sky-600 text-white', icon: 'home_work', label: 'WFH' },
  PENDING_WFH:   { cellBg: 'bg-sky-50/40 hover:bg-sky-50/70 border-2 border-dashed border-sky-300', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700 border border-sky-300', icon: 'schedule', label: 'Pending WFH' },
  LEAVE:         { cellBg: 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200', text: 'text-amber-800', badge: 'bg-amber-500 text-white', icon: 'beach_access', label: 'Leave' },
  PENDING_LEAVE: { cellBg: 'bg-amber-50/40 hover:bg-amber-50/70 border-2 border-dashed border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border border-amber-300', icon: 'hourglass_top', label: 'Pending Leave' },
  ABSENT:        { cellBg: 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-100', text: 'text-rose-700', badge: 'bg-rose-500 text-white', icon: 'block', label: 'Absent' },
  HOLIDAY:       { cellBg: 'bg-indigo-50/80 hover:bg-indigo-100/90 border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-600 text-white', icon: 'event', label: 'Holiday' },
  WEEKEND:       { cellBg: 'bg-slate-100/50 hover:bg-slate-100 border-slate-200/50', text: 'text-slate-400', badge: 'bg-slate-200 text-slate-600', icon: 'weekend', label: 'Weekend' },
};

function AttendanceCalendar({ calendarDays, currentDate, onPrev, onNext, loading }) {
  const offset = DateHelper.monthStartOffset(currentDate.month, currentDate.year);
  const total = DateHelper.daysInMonth(currentDate.month, currentDate.year);
  const map = {}; (calendarDays || []).forEach(d => { map[new Date(d.date).getDate()] = d; });
  const now = new Date();
  const todayN = (now.getMonth() + 1 === currentDate.month && now.getFullYear() === currentDate.year) ? now.getDate() : -1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-base text-slate-900">{MONTHS[currentDate.month - 1]} {currentDate.year}</h3>
          <div className="flex gap-1">
            <button onClick={onPrev} className="p-1 hover:bg-slate-200 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <button onClick={onNext} className="p-1 hover:bg-slate-200 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          {[
            ['bg-emerald-500', 'Present'],
            ['bg-sky-600', 'WFH'],
            ['bg-sky-400 border border-dashed border-sky-400', 'Pending WFH'],
            ['bg-amber-500', 'Leave'],
            ['bg-amber-400 border border-dashed border-amber-400', 'Pending Leave'],
            ['bg-indigo-600', 'Holiday']
          ].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
              <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
              <span className="text-slate-600">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekday Grid Label */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] font-black tracking-wider text-slate-400 bg-slate-50/60">{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading monthly attendance calendar...</div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={'o' + i} className="min-h-[76px] border-b border-r border-slate-100 bg-slate-50/30" />
          ))}
          {Array.from({ length: total }).map((_, i) => {
            const n = i + 1;
            const rec = map[n];
            const isT = n === todayN;
            const statusKey = rec?.status || (isT ? 'PRESENT' : 'UPCOMING');
            const style = CAL_STATUS_STYLES[statusKey] || {
              cellBg: 'bg-white hover:bg-slate-50 border-slate-100',
              text: 'text-slate-700',
              badge: 'bg-slate-100 text-slate-600',
              icon: 'circle',
              label: statusKey.replace('_', ' ')
            };

            return (
              <div
                key={n}
                className={`min-h-[76px] p-2 border-b border-r border-slate-100 transition-all hover:z-10 hover:shadow-md ${style.cellBg} ${
                  isT ? 'ring-2 ring-inset ring-[#0A2240] shadow-sm' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[11px] font-black ${isT ? 'text-[#0A2240]' : style.text}`}>
                    {String(n).padStart(2, '0')}
                  </span>
                  {isT && (
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#0A2240] text-white">Today</span>
                  )}
                </div>

                {rec?.status && (
                  <div className={`mt-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 shadow-2xs ${style.badge}`}>
                    <span className="material-symbols-outlined text-[11px]">{style.icon}</span>
                    <span className="truncate">{style.label}</span>
                  </div>
                )}

                {rec?.checkInTime && (
                  <div className="text-[9px] font-mono text-slate-500 font-bold mt-1 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">schedule</span>
                    {rec.checkInTime.substring(0, 5)}
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

function MetricCard({ label, value, icon, colorClass, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <span className={`material-symbols-outlined text-[22px] opacity-50 ${colorClass}`}>{icon}</span>
      </div>
      <div className={`text-[28px] font-bold tabular-nums ${colorClass}`}>{value}</div>
      {sub && <div className="text-[10px] mt-1 text-gray-400 font-medium">{sub}</div>}
    </div>
  );
}

const MCLS = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0A2240]/30 focus:border-[#0A2240]/60 transition-all bg-white';

function Modal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#0A2240]">{icon}</span>{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg"><span className="material-symbols-outlined text-[18px] text-gray-500">close</span></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function MF({ label, req, children }) {
  return <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}{req && <span className="text-rose-500 ml-0.5">*</span>}</label>{children}</div>;
}

function MA({ onClose, busy, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
      <button type="submit" disabled={busy} className="flex-1 py-2 bg-[#0A2240] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3E62] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[16px]">send</span>{busy ? 'Submitting...' : label}
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
    if (!tid || !from || !to) { alert('Fill all required fields.'); return; }
    setBusy(true);
    try {
      await attendanceApi.submitLeave({ leaveTypeId: Number(tid), fromDate: from, toDate: to, reason });
      onSuccess();
    } catch (er) {
      alert(er.response?.data?.message || er.message || 'Failed');
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
        <MF label="Reason"><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Brief reason..." className={MCLS + ' resize-none'} /></MF>
        <MA onClose={onClose} busy={busy} label="Submit Leave Request" />
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
    if (!date || !reason) { alert('Fill all required fields.'); return; }
    setBusy(true);
    try {
      await attendanceApi.submitWfh({ wfhDate: date, reason });
      onSuccess();
    } catch (er) {
      alert(er.response?.data?.message || er.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Apply for WFH" icon="home_work" onClose={onClose}>
      <form onSubmit={sub} className="space-y-4">
        <MF label="WFH Date" req><input type="date" value={date} onChange={e => setDate(e.target.value)} className={MCLS} /></MF>
        <MF label="Reason" req><input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for WFH..." className={MCLS} /></MF>
        <MA onClose={onClose} busy={busy} label="Submit WFH Request" />
      </form>
    </Modal>
  );
}

export const AttendanceScreen = () => {
  const { hasPermission } = useAuth();

  // Role Checks: Managers and Admins are NOT allowed to create self-service Leave/WFH requests for themselves
  const isManagerOrAdmin = hasPermission('ATTENDANCE_VIEW_TEAM') || hasPermission('LEAVE_APPROVE') || hasPermission('WFH_APPROVE') || hasPermission('HOLIDAY_MANAGE');
  const canApplyLeave = hasPermission('LEAVE_CREATE') && !isManagerOrAdmin;
  const canApplyWfh = hasPermission('WFH_CREATE') && !isManagerOrAdmin;
  const canViewTeam = isManagerOrAdmin;

  // Sub-Tab Switcher for Manager / Admin: 1st "My Attendance", 2nd "Team Attendance"
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
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histPage, setHistPage] = useState(0);
  const [histTotal, setHistTotal] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [leaveModal, setLeaveModal] = useState(false);
  const [wfhModal, setWfhModal] = useState(false);

  // Manager & Admin Data State
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
      const d = await attendanceApi.getCalendar(currentDate.month, currentDate.year);
      setCalendarDays(d || []);
      const c = { PRESENT: 0, ABSENT: 0, WFH: 0, LEAVE: 0, PENDING_LEAVE: 0, PENDING_WFH: 0, HALF_DAY: 0, HOLIDAY: 0, WEEKEND: 0 };
      (d || []).forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
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
      if (b.status === 'fulfilled') setLeaveBalances(b.value || []);
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

  const fetchHist = async () => {
    setHistLoading(true);
    try {
      const d = await attendanceApi.getHistory({ page: histPage, size: 5 });
      setHistRows(d.content || []);
      setHistTotal(d.totalPages || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
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
  useEffect(() => { fetchHist(); }, [histPage]);
  useEffect(() => { if (viewTab === 'team_attendance') { fetchTeamRoster(); fetchPendingApprovals(); } }, [viewTab, teamDate]);

  const handleCI = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkIn(location);
      await fetchToday();
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

  return (
    <div className="animate-fade-in select-none space-y-5">
      {/* Top Header & 2 Sub-Tabs for Manager/Admin */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MONTHS[currentDate.month - 1]} {currentDate.year} Overview</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manager / Admin Sub-Tabs */}
          {canViewTeam && (
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 shadow-2xs">
              <button
                onClick={() => setViewTab('my_attendance')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  viewTab === 'my_attendance'
                    ? 'bg-[#0A2240] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                My Attendance
              </button>

              <button
                onClick={() => setViewTab('team_attendance')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  viewTab === 'team_attendance'
                    ? 'bg-[#0A2240] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">groups</span>
                Team Attendance
                {totalPendingCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                    {totalPendingCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {canApplyLeave && (
            <button onClick={() => setLeaveModal(true)} className="flex items-center gap-2 bg-[#0A2240] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1E3E62] transition-all active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">add_task</span>Submit Leave Request
            </button>
          )}
          {canApplyWfh && (
            <button onClick={() => setWfhModal(true)} className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">home_work</span>Submit WFH Request
            </button>
          )}
        </div>
      </div>

      {/* ─── SUB TAB 1: MY ATTENDANCE CONTROL CENTER ────────────────────────── */}
      {viewTab === 'my_attendance' && (
        <>
          {/* Top 4 Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Dark Navy Hero Card */}
              <div className="lg:col-span-2 bg-[#0A2240] text-white rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none"><span className="material-symbols-outlined text-[72px]">schedule</span></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Attendance Status</span>
                    {isCI && !isCO && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse-slow">Working</span>}
                    {isCO && <span className="bg-gray-400 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Completed</span>}
                    {!isCI && <span className="bg-gray-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Offline</span>}
                  </div>
                  <LiveClock /><p className="text-[10px] text-blue-200/70 mt-1">Current Server Time</p>
                </div>
                {geoError && <div className="mt-2 text-[10px] text-amber-300 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_off</span>{geoError}</div>}
                <div className="mt-4">
                  {!isCI ? (
                    <button onClick={handleCI} disabled={checkingIn} className="w-full bg-white text-[#0A2240] py-2 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
                      <span className="material-symbols-outlined text-[18px]">login</span>{checkingIn ? 'Checking In...' : 'Check-In Now'}
                    </button>
                  ) : !isCO ? (
                    <button onClick={handleCO} disabled={checkingOut} className="w-full bg-white text-rose-700 py-2 rounded-xl font-semibold text-sm hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
                      <span className="material-symbols-outlined text-[18px]">logout</span>{checkingOut ? 'Checking Out...' : 'Check-Out Now'}
                    </button>
                  ) : (
                    <div className="w-full bg-emerald-500/20 text-emerald-300 py-2 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>Shift Completed — {wkHrs}
                    </div>
                  )}
                </div>
              </div>

              <MetricCard label="Present" value={String(monthStats?.PRESENT ?? '--').padStart(2, '0')} icon="how_to_reg" colorClass="text-blue-600" sub={pct + '% attendance rate'} />
              <MetricCard label="Leaves Taken" value={String((monthStats?.LEAVE || 0) + (monthStats?.PENDING_LEAVE || 0)).padStart(2, '0')} icon="beach_access" colorClass="text-rose-500" sub="Approved & Pending" />
              <MetricCard label="WFH Days" value={String((monthStats?.WFH || 0) + (monthStats?.PENDING_WFH || 0)).padStart(2, '0')} icon="business_center" colorClass="text-sky-600" sub="Approved & Pending" />
            </div>

            {/* Leave Balance Wallet Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
              <h3 className="font-semibold text-sm text-gray-800 mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#0A2240]">account_balance_wallet</span>
                  Leave Balance Wallet
                </span>
              </h3>
              {leaveBalances.length === 0 ? <p className="text-xs text-gray-400">No balance data.</p> : (
                <div className="space-y-3">
                  {leaveBalances.slice(0, 4).map(b => {
                    const rem = Math.max(0, (b.totalDays || 0) - (b.usedDays || 0));
                    const p = b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0;
                    const bar = p > 80 ? 'bg-rose-500' : p > 50 ? 'bg-amber-500' : 'bg-emerald-600';
                    return (
                      <div key={b.leaveTypeId} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-800 font-bold">{b.leaveTypeName}</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700">
                            {b.usedDays} used / {b.totalDays} total
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className={bar + ' h-full rounded-full transition-all'} style={{ width: p + '%' }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                          <span>{p}% utilized</span>
                          <span className="font-bold text-emerald-700">{rem} days available</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Middle Calendar & Side Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AttendanceCalendar calendarDays={calendarDays} currentDate={currentDate} onPrev={navP} onNext={navN} loading={calLoading} />
            </div>

            <div className="flex flex-col gap-4">
              {/* Recent Requests Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex-1">
                <h3 className="font-semibold text-sm text-gray-800 mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#0A2240]">history</span>
                  My Recent Applications
                </h3>
                {recentReqs.length === 0 ? <p className="text-xs text-gray-400">No recent requests.</p> : (
                  <div className="space-y-3">
                    {recentReqs.map((r, i) => {
                      const isW = r._t === 'wfh';
                      const ds = isW ? (r.wfhDate || r.requestDate || '') : ((r.fromDate || r.startDate || '') + ' to ' + (r.toDate || r.endDate || ''));
                      const lbl = isW ? 'Work From Home' : (r.leaveTypeName || 'Leave Request');
                      const ic = isW ? 'home_work' : 'beach_access';
                      const ibg = isW ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                      const st = r.status || 'PENDING';
                      const daysLabel = isW ? '1 Day' : (r.totalDays ? `${r.totalDays} ${r.totalDays === 1 ? 'Day' : 'Days'}` : '');

                      return (
                        <div key={i} className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/40 space-y-2 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${ibg}`}>
                                <span className="material-symbols-outlined text-[15px]">{ic}</span>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800">{lbl}</div>
                                {daysLabel && <span className="text-[10px] font-mono text-slate-500 font-bold">{daysLabel}</span>}
                              </div>
                            </div>
                            <StatusBadge status={st} />
                          </div>

                          <div className="text-[11px] font-mono text-slate-700 font-semibold bg-white p-2 rounded-lg border border-slate-100">
                            📅 {ds}
                          </div>

                          {r.reason && (
                            <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100">
                              "{r.reason}"
                            </p>
                          )}

                          {st === 'REJECTED' && r.rejectionReason && (
                            <div className="text-[10px] text-rose-700 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">info</span>
                              Rejection Note: {r.rejectionReason}
                            </div>
                          )}

                          {st === 'PENDING' && !isManagerOrAdmin && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleCancelRequest(r._id, r._t)}
                                className="text-rose-600 hover:text-rose-800 text-[10px] font-bold border border-rose-200 bg-white hover:bg-rose-50 rounded-lg px-2.5 py-1 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[12px]">block</span> Cancel Request
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Today's Shift Log */}
              {isCI && (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
                  <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Today's Shift Log</h3>
                  <div className="space-y-2">
                    {[
                      ['login', 'Check-In', todayData?.checkInTime || '--:--'],
                      ['logout', 'Check-Out', todayData?.checkOutTime || 'In progress'],
                      ['timer', 'Hours Worked', wkHrs],
                      ['location_on', 'Location', todayData?.checkInLocation || 'HQ']
                    ].map(([ic, lb, vl]) => (
                      <div key={lb} className="flex items-center gap-3"><span className="material-symbols-outlined text-[15px] text-gray-400">{ic}</span><span className="text-xs text-gray-500 w-24">{lb}</span><span className="text-xs font-semibold text-gray-800 font-mono">{vl}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Table: Detailed Attendance Log */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-800">Detailed Attendance Log</h3>
              <div className="flex gap-2">
                <button className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"><span className="material-symbols-outlined text-[18px] text-gray-500">filter_list</span></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Date', 'Status', 'In Time', 'Out Time', 'Total Hours', 'Location', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {histLoading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Loading records...</td></tr>
                  ) : histRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No attendance records found.</td></tr>
                  ) : histRows.map(row => {
                    const hrs = row.workingMinutes ? (Math.floor(row.workingMinutes / 60) + ':' + String(row.workingMinutes % 60).padStart(2, '0')) : '--';
                    return (
                      <tr key={row.attendanceId || row.attendanceDate} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-700 font-semibold">{row.attendanceDate}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={row.status || row.attendanceStatus} /></td>
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{row.checkInTime || '--:--'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{row.checkOutTime || '--:--'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-700">{hrs}</td>
                        <td className="px-4 py-3.5 text-xs text-gray-500"><span className="material-symbols-outlined text-[12px] align-middle mr-0.5">location_on</span>{row.checkInLocation || 'HQ'}</td>
                        <td className="px-4 py-3.5"><button className="p-1.5 text-gray-400 hover:text-[#0A2240] transition-colors"><span className="material-symbols-outlined text-[18px]">info</span></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/40">
              <span className="text-[10px] text-gray-400 font-medium">Page {histPage + 1} of {Math.max(histTotal, 1)}</span>
              <div className="flex gap-1.5">
                <button disabled={histPage === 0} onClick={() => setHistPage(p => p - 1)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                <button className="px-3 py-1 border border-[#0A2240] text-[#0A2240] rounded-lg text-xs bg-[#0A2240]/5 font-semibold">{histPage + 1}</button>
                <button disabled={histPage >= histTotal - 1} onClick={() => setHistPage(p => p + 1)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── SUB TAB 2: MERGED TEAM ATTENDANCE & APPROVALS ───────────────────── */}
      {viewTab === 'team_attendance' && (
        <div className="space-y-6">
          {/* Top Metrics Cards Row */}
          {teamSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-100 text-center shadow-2xs">
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Present</div>
                <div className="text-2xl font-black text-emerald-800 mt-0.5">{teamSummary.totalPresent}</div>
              </div>
              <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-100 text-center shadow-2xs">
                <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Absent</div>
                <div className="text-2xl font-black text-rose-800 mt-0.5">{teamSummary.totalAbsent}</div>
              </div>
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-100 text-center shadow-2xs">
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">On Leave</div>
                <div className="text-2xl font-black text-amber-800 mt-0.5">{teamSummary.totalLeave}</div>
              </div>
              <div className="bg-sky-50/80 p-3.5 rounded-2xl border border-sky-100 text-center shadow-2xs">
                <div className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">WFH</div>
                <div className="text-2xl font-black text-sky-800 mt-0.5">{teamSummary.totalWfh}</div>
              </div>
              <div className="bg-purple-50/80 p-3.5 rounded-2xl border border-purple-100 text-center shadow-2xs col-span-2 md:col-span-1">
                <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Pending Approvals</div>
                <div className="text-2xl font-black text-purple-800 mt-0.5">{totalPendingCount}</div>
              </div>
            </div>
          )}

          {/* Merged Section 1: Pending Approvals Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">verified</span>
                Pending Requests Approval Desk
              </h3>
              {totalPendingCount > 0 && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {totalPendingCount} Action Required
                </span>
              )}
            </div>

            {totalPendingCount === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-[28px] text-emerald-500">task_alt</span>
                No pending leave or WFH requests to approve. All requests are cleared!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pending Leaves Cards */}
                {pendingLeaves.map(r => (
                  <div key={r.leaveRequestId} className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">beach_access</span>
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{r.employeeName || 'Employee'}</h4>
                          <span className="text-[10px] text-slate-500 font-mono font-medium block">
                            {r.employeeId ? `${r.employeeId} • ${r.email || ''}` : 'Leave Applicant'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status="PENDING" />
                    </div>

                    <div className="bg-white/90 p-3 rounded-lg border border-amber-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{r.leaveTypeName || 'Leave Application'}</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                          {r.totalDays || 1} {r.totalDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 font-semibold">
                        📅 {r.fromDate} to {r.toDate}
                      </div>
                      <p className="text-xs text-slate-600 italic pt-1">
                        "{r.reason || 'No reason provided'}"
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(r.leaveRequestId, 'leave')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.leaveRequestId, 'leave')}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span> Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pending WFH Cards */}
                {pendingWfh.map(r => (
                  <div key={r.wfhRequestId} className="p-4 rounded-xl border border-sky-200/80 bg-sky-50/30 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">home_work</span>
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{r.employeeName || 'Employee'}</h4>
                          <span className="text-[10px] text-slate-500 font-mono font-medium block">
                            {r.employeeId ? `${r.employeeId} • ${r.email || ''}` : 'WFH Applicant'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status="PENDING" />
                    </div>

                    <div className="bg-white/90 p-3 rounded-lg border border-sky-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Work From Home Application</span>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-full">
                          1 Day
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 font-semibold">
                        📅 WFH Date: {r.wfhDate}
                      </div>
                      <p className="text-xs text-slate-600 italic pt-1">
                        "{r.reason || 'No reason provided'}"
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(r.wfhRequestId, 'wfh')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.wfhRequestId, 'wfh')}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Merged Section 2: Team Roster & Daily Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0A2240] text-[22px]">badge</span>
                Team Attendance Roster Log
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={teamDate}
                  onChange={e => setTeamDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50"
                />
                <input
                  type="text"
                  placeholder="Search employee name or ID..."
                  value={teamSearchText}
                  onChange={e => setTeamSearchText(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 w-52 bg-slate-50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Working Hours</th>
                    <th className="px-4 py-3">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {teamAttendance.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">No attendance records found for this date.</td></tr>
                  ) : (
                    teamAttendance
                      .filter(e => !teamSearchText || e.employeeName?.toLowerCase().includes(teamSearchText.toLowerCase()) || e.employeeId?.toLowerCase().includes(teamSearchText.toLowerCase()))
                      .map(e => {
                        const hrs = e.workingMinutes ? `${Math.floor(e.workingMinutes / 60)}h ${e.workingMinutes % 60}m` : '--';
                        return (
                          <tr key={e.employeeId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{e.employeeId}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{e.employeeName}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{e.checkInTime || '--:--'}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{e.checkOutTime || '--:--'}</td>
                            <td className="px-4 py-3 font-mono text-blue-600 font-bold">{hrs}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
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
