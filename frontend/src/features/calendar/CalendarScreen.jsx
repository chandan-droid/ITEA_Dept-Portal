import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { calendarApi } from '../../core/api/calendarApi';
import {
  ChevronLeft, ChevronRight, Clock, CheckSquare,
  Briefcase, Home, Megaphone, Calendar, Activity, Loader2
} from 'lucide-react';

// ─── Event Type Configuration ─────────────────────────────────────────────────
const EVENT_TYPES = [
  { key: 'ATTENDANCE',   label: 'Attendance',   color: '#10b981', bg: '#d1fae5', Icon: Activity  },
  { key: 'LEAVE',        label: 'Leave',         color: '#f97316', bg: '#ffedd5', Icon: Calendar   },
  { key: 'WFH',          label: 'WFH',           color: '#3b82f6', bg: '#dbeafe', Icon: Home       },
  { key: 'TASK',         label: 'Tasks',         color: '#8b5cf6', bg: '#ede9fe', Icon: CheckSquare},
  { key: 'PROJECT',      label: 'Projects',      color: '#06b6d4', bg: '#cffafe', Icon: Briefcase  },
  { key: 'HOLIDAY',      label: 'Holidays',      color: '#6b7280', bg: '#f3f4f6', Icon: Calendar   },
  { key: 'ANNOUNCEMENT', label: 'Announcements', color: '#ef4444', bg: '#fee2e2', Icon: Megaphone  },
];
const TYPE_MAP = Object.fromEntries(EVENT_TYPES.map(t => [t.key, t]));
const getColor = (type) => TYPE_MAP[type]?.color || '#6b7280';
const getBg    = (type) => TYPE_MAP[type]?.bg    || '#f3f4f6';

// ─── Date Utilities ───────────────────────────────────────────────────────────
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const fmtISO   = (d) => d.toISOString().split('T')[0];
const isToday  = (d) => fmtISO(d) === fmtISO(new Date());
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();
const fmtTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const monthGrid = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Event placement helpers ──────────────────────────────────────────────────
const eventsForDay = (events, date) =>
  events.filter(e => {
    if (!e.startDateTime) return false;
    const s = new Date(e.startDateTime);
    if (e.allDay) {
      const end = e.endDateTime ? new Date(e.endDateTime) : s;
      return date >= new Date(fmtISO(s)) && date <= new Date(fmtISO(end));
    }
    return isSameDay(s, date);
  });

// ─── Main Component ───────────────────────────────────────────────────────────
export const CalendarScreen = () => {
  const navigate = useNavigate();
  const [view, setView]             = useState('month');
  const [current, setCurrent]       = useState(new Date());
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [enabled, setEnabled]       = useState(new Set(EVENT_TYPES.map(t => t.key)));
  const [selected, setSelected]     = useState(null);
  const [upcoming, setUpcoming]     = useState([]);

  // ── Date range for current view ─────────────────────────────────────────────
  const dateRange = useCallback(() => {
    if (view === 'month') {
      const grid = monthGrid(current);
      return { start: fmtISO(grid[0]), end: fmtISO(grid[41]) };
    }
    if (view === 'week') {
      const ws = startOfWeek(current);
      return { start: fmtISO(ws), end: fmtISO(addDays(ws, 6)) };
    }
    return { start: fmtISO(current), end: fmtISO(current) };
  }, [view, current]);

  // ── Load events ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { start, end } = dateRange();
      const data = await calendarApi.getEvents({ startDate: start, endDate: end });
      setEvents(data || []);
    } catch (err) {
      setError('Failed to load calendar events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  // ── Load upcoming events (sidebar) ──────────────────────────────────────────
  useEffect(() => {
    calendarApi.getUpcomingEvents(8).then(setUpcoming).catch(() => {});
  }, []);

  const filtered = events.filter(e => enabled.has(e.type));

  const toggle = (key) => setEnabled(prev => {
    const s = new Set(prev);
    s.has(key) ? s.delete(key) : s.add(key);
    return s;
  });

  const goNext = () => {
    if (view === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === 'week') setCurrent(d => addDays(d, 7));
    else setCurrent(d => addDays(d, 1));
  };
  const goPrev = () => {
    if (view === 'month') setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === 'week') setCurrent(d => addDays(d, -7));
    else setCurrent(d => addDays(d, -1));
  };

  const headerTitle = () => {
    if (view === 'month') return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === 'week') {
      const ws = startOfWeek(current);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTHS[ws.getMonth()].slice(0,3)} ${ws.getDate()} – ${MONTHS[we.getMonth()].slice(0,3)} ${we.getDate()}, ${ws.getFullYear()}`;
    }
    return current.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const navigateEvent = (evt) => {
    if (evt.actionUrl) navigate(evt.actionUrl);
    setSelected(null);
  };

  return (
    <div className="flex gap-4 animate-fade-in select-none" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ─── LEFT SIDEBAR ───────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Event type filters */}
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Filters</h3>
          <div className="space-y-2">
            {EVENT_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => toggle(t.key)}
                className="w-full flex items-center gap-2.5 cursor-pointer group"
              >
                <div
                  className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all border-2"
                  style={enabled.has(t.key)
                    ? { backgroundColor: t.color, borderColor: t.color }
                    : { borderColor: '#e2e8f0', backgroundColor: 'white' }}
                >
                  {enabled.has(t.key) && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors text-left">{t.label}</span>
                <span className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1.5">
            <button
              onClick={() => setEnabled(new Set(EVENT_TYPES.map(t => t.key)))}
              className="flex-1 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition-all"
            >
              All
            </button>
            <button
              onClick={() => setEnabled(new Set())}
              className="flex-1 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-all"
            >
              None
            </button>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4 flex-1 overflow-y-auto min-h-0">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No upcoming events.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((evt, i) => {
                const meta = TYPE_MAP[evt.type] || {};
                const evtDate = evt.startDateTime ? new Date(evt.startDateTime) : null;
                return (
                  <div
                    key={i}
                    onClick={() => setSelected(evt)}
                    className="flex items-start gap-2 p-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-1.5 self-stretch rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: meta.color || '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-800 truncate leading-tight">{evt.title}</p>
                      {evtDate && (
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                          {evtDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                          {!evt.allDay && ' · ' + fmtTime(evt.startDateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ─── MAIN CALENDAR AREA ─────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/70 shadow-sm flex flex-col overflow-hidden">

        {/* Calendar Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrent(new Date()); }}
              className="px-3 py-1.5 text-xs font-extrabold border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all text-slate-700"
            >
              Today
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={goPrev} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-all text-slate-600">
                <ChevronLeft size={16} />
              </button>
              <button onClick={goNext} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition-all text-slate-600">
                <ChevronRight size={16} />
              </button>
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">{headerTitle()}</h2>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl capitalize transition-all cursor-pointer ${
                  view === v ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 size={28} className="animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-semibold">Loading events...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-sm font-bold text-rose-600 mb-3">{error}</p>
              <button onClick={load} className="text-xs text-blue-600 font-bold hover:underline cursor-pointer">Retry</button>
            </div>
          ) : view === 'month' ? (
            <MonthView
              days={monthGrid(current)}
              events={filtered}
              currentDate={current}
              onEventClick={setSelected}
              onDayClick={(d) => { setCurrent(d); setView('day'); }}
            />
          ) : view === 'week' ? (
            <WeekView
              weekStart={startOfWeek(current)}
              events={filtered}
              onEventClick={setSelected}
            />
          ) : (
            <DayView
              date={current}
              events={filtered}
              onEventClick={setSelected}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
          {EVENT_TYPES.map(t => (
            <div key={t.key} className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-[10px] font-semibold text-slate-500">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── EVENT DETAIL MODAL ─────────────────────────────────────────── */}
      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} onNavigate={navigateEvent} />
      )}
    </div>
  );
};

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ days, events, currentDate, onEventClick, onDayClick }) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-slate-100 shrink-0">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
        {days.map((day, idx) => {
          const inMonth = day.getMonth() === currentDate.getMonth();
          const today   = isToday(day);
          const dayEvts = eventsForDay(events, day);
          const maxShow = 3;
          const overflow = dayEvts.length - maxShow;
          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50/70 transition-colors overflow-hidden ${
                !inMonth ? 'bg-slate-50/30' : ''
              }`}
            >
              <div className="mb-1">
                <span className={`text-[11px] font-extrabold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                  today ? 'bg-blue-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvts.slice(0, maxShow).map((evt, i) => (
                  <div
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                    title={evt.title}
                    className="text-[9px] font-bold px-1.5 py-[2px] rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: getBg(evt.type), color: getColor(evt.type) }}
                  >
                    {!evt.allDay && <span className="opacity-70 mr-0.5">{fmtTime(evt.startDateTime)}</span>}
                    {evt.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                    className="text-[9px] font-extrabold text-blue-500 hover:text-blue-700 pl-1 cursor-pointer"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, events, onEventClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid border-b border-slate-100 shrink-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div className="border-r border-slate-100" />
        {days.map((day, i) => (
          <div key={i} className="py-2 text-center border-l border-slate-100">
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${isToday(day) ? 'text-blue-600' : 'text-slate-400'}`}>
              {WEEKDAYS[i]}
            </div>
            <div className={`text-lg font-extrabold w-9 h-9 mx-auto flex items-center justify-center rounded-full mt-0.5 ${
              isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-800'
            }`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      {days.some(d => eventsForDay(events, d).some(e => e.allDay)) && (
        <div className="grid border-b border-slate-100 shrink-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div className="text-[8px] font-extrabold text-slate-400 flex items-center justify-center border-r border-slate-100 py-1">ALL DAY</div>
          {days.map((day, i) => (
            <div key={i} className="border-l border-slate-100 p-0.5 space-y-0.5 py-1">
              {eventsForDay(events, day).filter(e => e.allDay).map((evt, ei) => (
                <div
                  key={ei}
                  onClick={() => onEventClick(evt)}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: getBg(evt.type), color: getColor(evt.type) }}
                >
                  {evt.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hourly grid */}
      <div className="overflow-y-auto flex-1">
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="grid border-b border-slate-50" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', minHeight: '52px' }}>
            <div className="text-[9px] font-bold text-slate-400 flex items-start justify-end pr-2 pt-1.5 border-r border-slate-100">
              {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`}
            </div>
            {days.map((day, i) => {
              const hourEvts = eventsForDay(events, day).filter(e => !e.allDay && e.startDateTime && new Date(e.startDateTime).getHours() === hour);
              return (
                <div key={i} className="border-l border-slate-100 p-0.5 space-y-0.5">
                  {hourEvts.map((evt, ei) => (
                    <div
                      key={ei}
                      onClick={() => onEventClick(evt)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: getBg(evt.type), color: getColor(evt.type) }}
                    >
                      {fmtTime(evt.startDateTime)} {evt.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ date, events, onEventClick }) {
  const dayEvts  = eventsForDay(events, date);
  const allDay   = dayEvts.filter(e => e.allDay);
  const timed    = dayEvts.filter(e => !e.allDay);
  const currentHourRef = useRef(null);

  useEffect(() => {
    if (isToday(date) && currentHourRef.current) {
      currentHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [date]);

  const nowHour = new Date().getHours();

  return (
    <div className="flex flex-col h-full">
      {allDay.length > 0 && (
        <div className="px-4 py-2.5 border-b border-slate-100 space-y-1.5 shrink-0">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">All Day</p>
          {allDay.map((evt, i) => (
            <div
              key={i}
              onClick={() => onEventClick(evt)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: getBg(evt.type) }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getColor(evt.type) }} />
              <span className="text-xs font-extrabold" style={{ color: getColor(evt.type) }}>{evt.title}</span>
              {evt.description && <span className="text-[10px] text-slate-500 truncate">{evt.description}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 24 }, (_, hour) => {
          const hourEvts = timed.filter(e => e.startDateTime && new Date(e.startDateTime).getHours() === hour);
          const isNow    = isToday(date) && hour === nowHour;
          return (
            <div
              key={hour}
              ref={isNow ? currentHourRef : null}
              className={`flex gap-4 px-4 border-b transition-colors ${isNow ? 'bg-blue-50/40 border-blue-100' : 'border-slate-50'}`}
              style={{ minHeight: '60px' }}
            >
              <div className={`text-[10px] font-bold w-12 shrink-0 pt-2 text-right ${isNow ? 'text-blue-600' : 'text-slate-400'}`}>
                {hour === 0 ? '12 AM' : `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`}
              </div>
              <div className="flex-1 py-1.5 space-y-1.5">
                {isNow && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[9px] font-extrabold text-blue-600">NOW</span>
                  </div>
                )}
                {hourEvts.map((evt, i) => (
                  <div
                    key={i}
                    onClick={() => onEventClick(evt)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: getBg(evt.type) }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getColor(evt.type) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold truncate" style={{ color: getColor(evt.type) }}>{evt.title}</div>
                      {evt.description && <div className="text-[10px] text-slate-500 truncate">{evt.description}</div>}
                    </div>
                    <div className="text-[9px] font-bold shrink-0" style={{ color: getColor(evt.type) }}>
                      {fmtTime(evt.startDateTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventModal({ event, onClose, onNavigate }) {
  const meta = TYPE_MAP[event.type] || {};
  const evtDate = event.startDateTime ? new Date(event.startDateTime) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">

        {/* Colored header */}
        <div className="px-5 pt-5 pb-4" style={{ backgroundColor: meta.color || '#6b7280' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">
              {event.type?.replace('_', ' ')}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer text-lg leading-none">×</button>
          </div>
          <h3 className="text-sm font-extrabold text-white leading-snug">{event.title}</h3>
          {evtDate && (
            <p className="text-xs text-white/75 mt-1.5 font-medium">
              {evtDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {!event.allDay && ' · ' + fmtTime(event.startDateTime)}
              {event.endDateTime && !event.allDay && ` – ${fmtTime(event.endDateTime)}`}
            </p>
          )}
        </div>

        <div className="p-5 space-y-4">
          {event.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          )}
          <div className="flex gap-2 pt-1">
            {event.actionUrl && (
              <button
                onClick={() => onNavigate(event)}
                className="flex-1 py-2.5 text-xs font-extrabold text-white rounded-2xl transition-all active:scale-95 cursor-pointer"
                style={{ backgroundColor: meta.color || '#6b7280' }}
              >
                View in {event.referenceType?.toLowerCase() || 'module'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
