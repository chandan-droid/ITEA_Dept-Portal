import React, { useState, useEffect } from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { attendanceApi } from '../../core/api/attendanceApi';
import { Card } from '../../shared/components/Card';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { Table } from '../../shared/components/Table';
import {
  MapPin, Clock, Calendar, Users, BarChart2, Briefcase, Play, Square,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight, Send, Check, X
} from 'lucide-react';

export const AttendanceScreen = () => {
  const { hasPermission } = useAuth();

  // Active tab selection
  const [activeTab, setActiveTab] = useState('today');

  // Define tabs with permission restrictions
  const tabs = [
    { id: 'today', label: 'Today', icon: Clock, show: hasPermission('ATTENDANCE_VIEW_SELF') },
    { id: 'history', label: 'History', icon: Calendar, show: hasPermission('ATTENDANCE_HISTORY_VIEW') },
    { id: 'calendar', label: 'Calendar View', icon: Calendar, show: hasPermission('ATTENDANCE_VIEW_SELF') },
    { id: 'team', label: 'Team Tracker', icon: Users, show: hasPermission('ATTENDANCE_VIEW_TEAM') },
    { id: 'reports', label: 'Reports', icon: BarChart2, show: hasPermission('ATTENDANCE_REPORT_VIEW') },
    { id: 'leave', label: 'Leaves & WFH', icon: Briefcase, show: hasPermission('LEAVE_VIEW_SELF') }
  ].filter(tab => tab.show);

  // Set the first visible tab if 'today' is hidden
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs]);

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Attendance Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your daily check-in, review calendar logs, view team directory status, and apply for leaves.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-large whitespace-nowrap transition-all duration-200 border-b-2 -mb-[6px] ${
                isActive
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-gray-500 hover:text-secondary-dark hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'leave' && <LeaveTab />}
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTS FOR EACH TAB ───────────────────────────────────────────

// 1. TODAY TAB
const TodayTab = () => {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const fetchToday = async () => {
    try {
      const data = await attendanceApi.getToday();
      setTodayData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    // Fetch geo position on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          setGeoError('GPS location permission denied. Proceeding with IP logging.');
        }
      );
    } else {
      setGeoError('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkIn(location);
      await fetchToday();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to Check-Out?')) return;
    setCheckingOut(true);
    try {
      await attendanceApi.checkOut();
      await fetchToday();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="text-sm font-semibold text-gray-500 text-center py-10">Loading today's logs...</div>;

  const isCheckedIn = todayData?.status !== 'NOT_CHECKED_IN' && todayData?.checkInTime;
  const isCheckedOut = todayData?.checkOutTime != null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        <Card title="Shift Controls" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Clock size={120} className="text-primary" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mt-2">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shift Status</span>
              <div className="text-3xl font-extrabold text-secondary-dark tracking-tight">
                {isCheckedOut ? 'SHIFT COMPLETED' : isCheckedIn ? 'SHIFT ACTIVE' : 'NOT ON DUTY'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Standard shift: 9:00 AM — 5:30 PM (Required 8 hours for Present status)
              </p>
            </div>

            <div className="flex gap-4">
              {!isCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="md-button-primary !bg-emerald-600 hover:!bg-emerald-700 !px-6 !py-3 font-bold"
                >
                  <Play size={18} />
                  <span>Check In</span>
                </button>
              ) : !isCheckedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="md-button-primary !bg-rose-600 hover:!bg-rose-700 !px-6 !py-3 font-bold"
                >
                  <Square size={18} />
                  <span>Check Out</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-large text-sm">
                  <CheckCircle2 size={16} />
                  <span>Shift Completed</span>
                </div>
              )}
            </div>
          </div>

          {geoError && (
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-large">
              <AlertCircle size={14} />
              <span>{geoError}</span>
            </div>
          )}

          {location && !isCheckedIn && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-large">
              <MapPin size={14} />
              <span>GPS coords locked successfully: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
            </div>
          )}
        </Card>

        {/* Detailed Check-In Details Card */}
        {isCheckedIn && (
          <Card title="Today's Shift Log">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase block">Check-In Time</span>
                <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">{todayData.checkInTime || '--:--'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase block">Check-Out Time</span>
                <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">{todayData.checkOutTime || '--:--'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase block">Active Hours</span>
                <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">
                  {todayData.workingMinutes ? `${Math.floor(todayData.workingMinutes / 60)}h ${todayData.workingMinutes % 60}m` : 'On duty'}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div>
        <Card title="Attendance Card">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              isCheckedOut ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : isCheckedIn ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-400'
            }`}>
              <Clock size={28} className={isCheckedIn && !isCheckedOut ? 'animate-pulse' : ''} />
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase block">Today's Designation</span>
              <div className="mt-1.5">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  todayData?.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                  todayData?.status === 'HALF_DAY' ? 'bg-amber-100 text-amber-800' :
                  todayData?.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {todayData?.status || 'NOT AVAILABLE'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// 2. HISTORY TAB
const HistoryTab = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getHistory({
        page,
        size: 10,
        status: statusFilter || undefined
      });
      setHistory(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, statusFilter]);

  const columns = [
    {
      header: 'Date',
      accessor: (row) => <span className="font-semibold text-secondary-dark">{row.attendanceDate}</span>
    },
    {
      header: 'Check-In',
      accessor: (row) => <span className="font-mono text-xs">{row.checkInTime || '--:--'}</span>
    },
    {
      header: 'Check-Out',
      accessor: (row) => <span className="font-mono text-xs">{row.checkOutTime || '--:--'}</span>
    },
    {
      header: 'Minutes Logged',
      accessor: (row) => <span className="font-semibold">{row.workingMinutes ? `${row.workingMinutes} mins` : '-'}</span>
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-white border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="ABSENT">Absent</option>
          <option value="LEAVE">Leave</option>
          <option value="WFH">WFH</option>
        </select>
      </div>

      <Table
        columns={columns}
        data={history}
        keyExtractor={(row) => row.attendanceDate}
        isLoading={loading}
        emptyMessage="No attendance history logs found."
      />

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white border border-gray-200/60 px-4 py-3 rounded-large shadow-sm">
          <span className="text-xs font-semibold text-gray-500">
            Page <span className="text-secondary-dark font-bold">{page + 1}</span> of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 border border-gray-200 rounded-large hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 border border-gray-200 rounded-large hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. CALENDAR TAB
const CalendarTab = () => {
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(LocalDateHelper.today());

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getCalendar(currentDate.month, currentDate.year);
      setCalendarDays(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentDate]);

  const handlePrevMonth = () => {
    let nextMonth = currentDate.month - 1;
    let nextYear = currentDate.year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setCurrentDate({ month: nextMonth, year: nextYear });
  };

  const handleNextMonth = () => {
    let nextMonth = currentDate.month + 1;
    let nextYear = currentDate.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setCurrentDate({ month: nextMonth, year: nextYear });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Card className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-secondary-dark">
          {monthNames[currentDate.month - 1]} {currentDate.year}
        </h3>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-1.5 border border-gray-200 hover:bg-slate-50 rounded-large">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextMonth} className="p-1.5 border border-gray-200 hover:bg-slate-50 rounded-large">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 font-semibold">Loading calendar...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-xs font-bold text-gray-400 py-2">{d}</div>
          ))}

          {/* Render calendar alignment padding cells */}
          {LocalDateHelper.getMonthStartOffset(currentDate.month, currentDate.year).map((_, i) => (
            <div key={`offset-${i}`} className="aspect-square bg-gray-50/40 rounded-large" />
          ))}

          {calendarDays.map((day) => {
            const dateObj = new Date(day.date);
            const dateNum = dateObj.getDate();
            const isToday = LocalDateHelper.isToday(day.date);

            const statusColors = {
              PRESENT: 'bg-green-500 text-white',
              HALF_DAY: 'bg-amber-500 text-white',
              ABSENT: 'bg-red-500 text-white',
              LEAVE: 'bg-indigo-500 text-white',
              WFH: 'bg-purple-500 text-white',
              HOLIDAY: 'bg-sky-500 text-white',
              WEEKEND: 'bg-slate-100 text-slate-400',
              UPCOMING: 'bg-white text-gray-300 border border-dashed border-gray-200'
            };

            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.status}`}
                className={`aspect-square flex flex-col justify-between p-2 rounded-large text-xs font-bold shadow-sm transition-all duration-300 ${
                  statusColors[day.status] || 'bg-white text-gray-700'
                } ${isToday ? 'ring-2 ring-accent ring-offset-2' : ''}`}
              >
                <span>{dateNum}</span>
                <span className="text-[9px] font-extrabold tracking-tight hidden sm:block opacity-90">{day.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// 4. TEAM TAB (Managers/Admins only)
const TeamTab = () => {
  const [teamList, setTeamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadTeamStatus = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getTeamAttendance(selectedDate);
      setTeamList(data.teamAttendance || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamStatus();
  }, [selectedDate]);

  const columns = [
    {
      header: 'Employee ID',
      accessor: (row) => <span className="font-mono text-primary font-bold">{row.employeeId}</span>
    },
    {
      header: 'Employee Name',
      accessor: 'employeeName'
    },
    {
      header: 'Status Today',
      accessor: (row) => <StatusBadge status={row.status} />
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-lg text-secondary-dark">Daily Team Tracker</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark focus:outline-none"
        />
      </div>

      <Table
        columns={columns}
        data={teamList}
        keyExtractor={(row) => row.employeeId}
        isLoading={loading}
        emptyMessage="No records for the selected date."
      />
    </div>
  );
};

// 5. REPORTS TAB (Managers/Admins only)
const ReportsTab = () => {
  const [fromDate, setFromDate] = useState(LocalDateHelper.startOfMonth());
  const [toDate, setToDate] = useState(LocalDateHelper.endOfMonth());
  const [personalReport, setPersonalReport] = useState(null);
  const [teamReport, setTeamReport] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const fetchReports = async () => {
    setLoadingPersonal(true);
    setLoadingTeam(true);
    try {
      const report = await attendanceApi.getReport(fromDate, toDate);
      setPersonalReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPersonal(false);
    }

    try {
      const tReport = await attendanceApi.getTeamReport(fromDate, toDate);
      setTeamReport(tReport || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  const teamReportColumns = [
    { header: 'Employee', accessor: 'employeeName' },
    { header: 'Present', accessor: 'present' },
    { header: 'Absent', accessor: 'absent' },
    { header: 'Leave', accessor: 'leave' },
    { header: 'WFH', accessor: 'wfh' },
    { header: 'Half Day', accessor: 'halfDay' },
    {
      header: 'Working Hours',
      accessor: (row) => <span>{Math.floor(row.workingMinutes / 60)}h {row.workingMinutes % 60}m</span>
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap gap-4 bg-white border border-gray-200/60 p-4 rounded-large items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent border border-gray-200 rounded-large px-3 py-1.5 text-xs font-semibold text-secondary-dark focus:outline-none"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent border border-gray-200 rounded-large px-3 py-1.5 text-xs font-semibold text-secondary-dark focus:outline-none"
            />
          </div>
        </div>
        <button onClick={fetchReports} className="md-button-primary text-xs py-2 px-4">Refresh Summary</button>
      </div>

      {loadingPersonal ? (
        <div>Generating report...</div>
      ) : (
        personalReport && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card title="Present" className="text-center font-bold text-emerald-600 bg-emerald-50/50">
              <span className="text-3xl mt-1 block">{personalReport.summary.present}</span>
            </Card>
            <Card title="Half Day" className="text-center font-bold text-amber-600 bg-amber-50/50">
              <span className="text-3xl mt-1 block">{personalReport.summary.halfDay}</span>
            </Card>
            <Card title="Absent" className="text-center font-bold text-rose-600 bg-rose-50/50">
              <span className="text-3xl mt-1 block">{personalReport.summary.absent}</span>
            </Card>
            <Card title="WFH" className="text-center font-bold text-purple-600 bg-purple-50/50">
              <span className="text-3xl mt-1 block">{personalReport.summary.wfh}</span>
            </Card>
            <Card title="Leaves" className="text-center font-bold text-indigo-600 bg-indigo-50/50">
              <span className="text-3xl mt-1 block">{personalReport.summary.leave}</span>
            </Card>
          </div>
        )
      )}

      <div>
        <h3 className="font-bold text-lg text-secondary-dark mb-4">Team Aggregate Summary</h3>
        <Table
          columns={teamReportColumns}
          data={teamReport}
          keyExtractor={(row) => row.employeeId}
          isLoading={loadingTeam}
          emptyMessage="No aggregate logs found."
        />
      </div>
    </div>
  );
};

// 6. LEAVES & WFH TAB
const LeaveTab = () => {
  const { hasPermission } = useAuth();

  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myWfhRequests, setMyWfhRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // WFH Form State
  const [wfhDate, setWfhDate] = useState('');
  const [wfhReason, setWfhReason] = useState('');
  const [submittingWfh, setSubmittingWfh] = useState(false);

  // Active sub-section view
  const [subView, setSubView] = useState('balances');

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const bal = await attendanceApi.getLeaveBalances();
      setBalances(bal || []);

      const types = await attendanceApi.getLeaveTypes();
      setLeaveTypes(types || []);

      const myReq = await attendanceApi.getMyLeaves();
      setMyRequests(myReq || []);

      const myWfh = await attendanceApi.getMyWfh();
      setMyWfhRequests(myWfh || []);

      if (hasPermission('LEAVE_APPROVE')) {
        const pending = await attendanceApi.getPendingLeaves();
        setPendingRequests(pending || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveTypeId || !fromDate || !toDate) {
      alert('Please fill in all fields.');
      return;
    }
    setSubmittingLeave(true);
    try {
      await attendanceApi.submitLeave({ leaveTypeId: Number(leaveTypeId), fromDate, toDate, reason });
      setFromDate('');
      setToDate('');
      setReason('');
      setLeaveTypeId('');
      alert('Leave application submitted successfully.');
      fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleApplyWfh = async (e) => {
    e.preventDefault();
    if (!wfhDate || !wfhReason) {
      alert('Please select date and reason.');
      return;
    }
    setSubmittingWfh(true);
    try {
      await attendanceApi.submitWfh({ wfhDate, reason: wfhReason });
      setWfhDate('');
      setWfhReason('');
      alert('WFH request submitted successfully.');
      fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'WFH submission failed');
    } finally {
      setSubmittingWfh(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Approve this request?')) return;
    try {
      await attendanceApi.approveLeave(id);
      fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    try {
      await attendanceApi.rejectLeave(id, reason || 'Rejected by Manager');
      fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  if (loading) return <div>Loading records...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Balances & Form Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Available Leave Balance">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {balances.map((b) => (
                <div key={b.leaveTypeId} className="border border-gray-200/60 p-4 rounded-large shadow-sm hover:border-accent/30 transition-all">
                  <span className="text-xs font-bold text-gray-400 block">{b.leaveTypeName}</span>
                  <span className="text-2xl font-extrabold text-secondary-dark mt-1 block">
                    {b.remainingDays} <span className="text-xs text-gray-400 font-normal">days left</span>
                  </span>
                  <div className="text-[10px] text-gray-400 mt-2 font-medium">
                    Used: {b.usedDays} / Total: {b.totalDays}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Requests Segment */}
          <div className="flex gap-2">
            <button onClick={() => setSubView('balances')} className={`px-4 py-1.5 text-xs font-bold rounded-large border ${subView === 'balances' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>My Leaves</button>
            <button onClick={() => setSubView('wfh')} className={`px-4 py-1.5 text-xs font-bold rounded-large border ${subView === 'wfh' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>My WFH Logs</button>
            {hasPermission('LEAVE_APPROVE') && (
              <button onClick={() => setSubView('pending')} className={`px-4 py-1.5 text-xs font-bold rounded-large border ${subView === 'pending' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-500 border-gray-200'}`}>Approvals ({pendingRequests.length})</button>
            )}
          </div>

          {subView === 'balances' && (
            <Card title="My Leave History">
              <Table
                columns={[
                  { header: 'Type', accessor: 'leaveTypeName' },
                  { header: 'From', accessor: 'fromDate' },
                  { header: 'To', accessor: 'toDate' },
                  { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> }
                ]}
                data={myRequests}
                keyExtractor={(row) => row.leaveRequestId}
                isLoading={false}
                emptyMessage="No leave requests filed yet."
              />
            </Card>
          )}

          {subView === 'wfh' && (
            <Card title="My WFH History">
              <Table
                columns={[
                  { header: 'Date requested', accessor: 'wfhDate' },
                  { header: 'Reason', accessor: 'reason' },
                  { header: 'Status', accessor: (row) => <StatusBadge status={row.status} /> }
                ]}
                data={myWfhRequests}
                keyExtractor={(row) => row.wfhRequestId}
                isLoading={false}
                emptyMessage="No WFH requests filed yet."
              />
            </Card>
          )}

          {subView === 'pending' && (
            <Card title="Pending Approvals">
              <Table
                columns={[
                  { header: 'Type', accessor: 'leaveTypeName' },
                  { header: 'From', accessor: 'fromDate' },
                  { header: 'To', accessor: 'toDate' },
                  { header: 'Reason', accessor: 'reason' },
                  {
                    header: 'Actions',
                    accessor: (row) => (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(row.leaveRequestId)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><Check size={16} /></button>
                        <button onClick={() => handleReject(row.leaveRequestId)} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><X size={16} /></button>
                      </div>
                    )
                  }
                ]}
                data={pendingRequests}
                keyExtractor={(row) => row.leaveRequestId}
                isLoading={false}
                emptyMessage="No pending approvals."
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Apply for Leave">
            <form onSubmit={handleApplyLeave} className="space-y-4 mt-2">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 mb-1">Leave Type</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="bg-white border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
                >
                  <option value="">Select Type</option>
                  {leaveTypes.map(t => (
                    <option key={t.leaveTypeId} value={t.leaveTypeId}>{t.typeName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows="3"
                  className="border border-gray-200 rounded-large p-3 text-sm font-semibold text-secondary-dark focus:outline-none"
                  placeholder="Explain brief reason for leave..."
                />
              </div>

              <button
                type="submit"
                disabled={submittingLeave}
                className="md-button-primary w-full text-xs font-bold py-2.5"
              >
                <Send size={14} />
                <span>Submit Request</span>
              </button>
            </form>
          </Card>

          <Card title="Apply for WFH">
            <form onSubmit={handleApplyWfh} className="space-y-4 mt-2">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 mb-1">WFH Date</label>
                <input
                  type="date"
                  value={wfhDate}
                  onChange={(e) => setWfhDate(e.target.value)}
                  className="border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 mb-1">Reason</label>
                <input
                  type="text"
                  value={wfhReason}
                  onChange={(e) => setWfhReason(e.target.value)}
                  className="border border-gray-200 rounded-large px-3 py-2 text-sm font-semibold text-secondary-dark"
                  placeholder="Reason for WFH..."
                />
              </div>

              <button
                type="submit"
                disabled={submittingWfh}
                className="md-button-primary w-full text-xs font-bold py-2.5"
              >
                <Send size={14} />
                <span>Submit WFH</span>
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── LOCAL STATE DATE HELPERS ──────────────────────────────────────────────
class LocalDateHelper {
  static today() {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  static getMonthStartOffset(month, year) {
    const d = new Date(year, month - 1, 1);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    return Array.from({ length: day });
  }

  static isToday(dateStr) {
    return new Date().toISOString().split('T')[0] === dateStr;
  }

  static startOfMonth() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}-01`;
  }

  static endOfMonth() {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${lastDay}`;
  }
}
