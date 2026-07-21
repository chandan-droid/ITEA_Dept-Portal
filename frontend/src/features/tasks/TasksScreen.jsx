import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { taskApi } from '../../core/api/taskApi';
import { projectApi } from '../../core/api/projectApi';
import { useAuth } from '../authentication/AuthProvider';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { useDebounce } from '../../shared/hooks/useDebounce';
import {
  ClipboardPlus, Search, RotateCcw, Calendar, Loader2,
  ChevronLeft, ChevronRight, CheckSquare, Clock, Flag, AlertTriangle, Layers
} from 'lucide-react';

const STATUS_PILLS = [
  { key: '',            label: 'All',        color: 'bg-slate-900 text-white border-slate-900',         inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  { key: 'TODO',        label: 'To Do',      color: 'bg-slate-700 text-white border-slate-700',          inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  { key: 'IN_PROGRESS', label: 'In Progress',color: 'bg-blue-600 text-white border-blue-600',            inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  { key: 'UNDER_REVIEW',label: 'Review',     color: 'bg-violet-600 text-white border-violet-600',        inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  { key: 'COMPLETED',   label: 'Done',       color: 'bg-emerald-600 text-white border-emerald-600',      inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
];

const getStatusStyle = (status) => {
  switch (status?.toUpperCase()) {
    case 'TODO':         return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    case 'IN_PROGRESS':  return { badge: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500'   };
    case 'ON_HOLD':
    case 'BLOCKED':      return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500'  };
    case 'UNDER_REVIEW':
    case 'IN_REVIEW':    return { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' };
    case 'COMPLETED':
    case 'APPROVED':     return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    case 'CANCELLED':    return { badge: 'bg-rose-50 text-rose-700 border-rose-200',    dot: 'bg-rose-500'   };
    default:             return { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400'  };
  }
};

const getPriorityMeta = (priority) => {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL': return { style: 'text-rose-700 bg-rose-50 border-rose-100',     icon: '🔴' };
    case 'HIGH':     return { style: 'text-amber-700 bg-amber-50 border-amber-100',  icon: '🟠' };
    case 'MEDIUM':   return { style: 'text-blue-700 bg-blue-50 border-blue-100',     icon: '🔵' };
    default:         return { style: 'text-slate-600 bg-slate-50 border-slate-100',  icon: '⚪' };
  }
};

export const TasksScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('my');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState(null);

  // Tab-specific status counts
  const [tabCounts, setTabCounts] = useState({ ALL: 0, TODO: 0, IN_PROGRESS: 0, UNDER_REVIEW: 0, COMPLETED: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const canCreate = hasPermission('TASK_CREATE');
  const canViewTeam = hasPermission('TASK_VIEW_TEAM');

  // Read ?projectId= query param on load to pre-filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('projectId');
    if (pid) setProjectFilter(pid);
  }, [location.search]);

  useEffect(() => {
    if (!canViewTeam && activeTab === 'team') setActiveTab('my');
  }, [canViewTeam]);

  useEffect(() => {
    if (tasks.length > 0) {
      if (!selectedTaskId || !tasks.some(t => t.taskId === selectedTaskId)) {
        setSelectedTaskId(tasks[0].taskId);
      }
    } else {
      setSelectedTaskId(null);
    }
  }, [tasks]);

  // Load projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const endpoint = canViewTeam
          ? projectApi.getTeamProjects({ page: 0, size: 200 })
          : projectApi.getMyProjects({ page: 0, size: 200 });
        const res = await endpoint;
        setProjects(res.content || []);
      } catch (err) {
        console.error('Failed to load project filter options', err);
      }
    };
    fetchProjects();
  }, [canViewTeam]);

  // Load tab-specific counts (no status/search filters, just tab scope)
  const fetchTabCounts = async () => {
    try {
      const fetchAll = activeTab === 'team' ? taskApi.getTeamTasks : taskApi.getMyTasks;
      const res = await fetchAll({ page: 0, size: 500 });
      const list = res.content || [];
      const counts = { ALL: list.length, TODO: 0, IN_PROGRESS: 0, UNDER_REVIEW: 0, COMPLETED: 0 };
      list.forEach(t => {
        const s = (t.status || '').toUpperCase();
        if (s === 'TODO') counts.TODO++;
        else if (s === 'IN_PROGRESS') counts.IN_PROGRESS++;
        else if (s === 'UNDER_REVIEW' || s === 'IN_REVIEW') counts.UNDER_REVIEW++;
        else if (s === 'COMPLETED' || s === 'APPROVED') counts.COMPLETED++;
      });
      setTabCounts(counts);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTabCounts(); }, [activeTab]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, size,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter ? parseInt(projectFilter, 10) : undefined,
        overdue: overdueFilter || undefined,
        sortBy: 'taskId',
        sortDirection: 'DESC'
      };
      const response = activeTab === 'team'
        ? await taskApi.getTeamTasks(params)
        : await taskApi.getMyTasks(params);

      setTasks(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      setError(err.message || 'Access denied or server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, activeTab, debouncedSearch, statusFilter, priorityFilter, projectFilter, overdueFilter]);

  const handleCreateTask = async (payload) => {
    await taskApi.create(payload);
    setPage(0);
    await loadTasks();
    await fetchTabCounts();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
    setOverdueFilter(false);
    setPage(0);
    navigate('/tasks', { replace: true });
  };

  const hasActiveFilters = search || statusFilter || priorityFilter || projectFilter || overdueFilter;

  return (
    <div className="space-y-4 select-none animate-fade-in font-sans pb-10">
      
      {/* ─── MASTER-DETAIL SPLIT LAYOUT ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* LEFT MASTER PANE */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4 space-y-3.5">

            {/* Top Toolbar: Tabs + New Task */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 flex-1">
                <button
                  onClick={() => { setActiveTab('my'); setPage(0); }}
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${activeTab === 'my' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  My Tasks
                </button>
                {canViewTeam && (
                  <button
                    onClick={() => { setActiveTab('team'); setPage(0); }}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${activeTab === 'team' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Team Tasks
                  </button>
                )}
              </div>
              {canCreate && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-2xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Create new task"
                >
                  <ClipboardPlus size={15} />
                  <span>New</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status filter pills with tab-specific counts */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {STATUS_PILLS.map(pill => {
                const countKey = pill.key === '' ? 'ALL' : pill.key;
                const count = tabCounts[countKey] || 0;
                const isActive = statusFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    onClick={() => { setStatusFilter(pill.key); setPage(0); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shrink-0 text-[10px] font-bold transition-all cursor-pointer ${
                      isActive ? pill.color : pill.inactive
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full leading-none ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filters row */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={priorityFilter}
                onChange={e => { setPriorityFilter(e.target.value); setPage(0); }}
                className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="">Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <select
                value={projectFilter}
                onChange={e => { setProjectFilter(e.target.value); setPage(0); }}
                className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.projectId} value={p.projectId}>
                    [{p.projectCode}] {p.projectName}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="p-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-200 cursor-pointer transition-all"
                  title="Clear all filters"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>

            {/* Project filter active indicator */}
            {projectFilter && projects.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <Layers size={13} className="text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold text-blue-700 truncate">
                  {projects.find(p => p.projectId === parseInt(projectFilter, 10))?.projectName || 'Project'}
                </span>
                <button onClick={() => { setProjectFilter(''); navigate('/tasks', { replace: true }); }} className="ml-auto text-blue-500 hover:text-blue-800 cursor-pointer text-[10px] font-extrabold shrink-0">×</button>
              </div>
            )}

            {/* ─── TASK CARDS LIST ─────────────────────────────────────── */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 size={28} className="animate-spin text-blue-600 mb-2" />
                <p className="text-xs font-semibold">Loading tasks...</p>
              </div>
            ) : error ? (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-semibold">{error}</div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400">No tasks match the active filter.</div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-0.5 scrollbar-none">
                {tasks.map(task => {
                  const statusStyle = getStatusStyle(task.status);
                  const priorityMeta = getPriorityMeta(task.priority);
                  const isSelected = task.taskId === selectedTaskId;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['COMPLETED', 'APPROVED', 'ARCHIVED', 'CANCELLED'].includes(task.status?.toUpperCase());

                  return (
                    <div
                      key={task.taskId}
                      onClick={() => setSelectedTaskId(task.taskId)}
                      className={`group rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200'
                          : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Left accent stripe */}
                      {!isSelected && (
                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${statusStyle.dot}`} />
                      )}

                      <div className="p-3.5 pl-4 space-y-2">
                        {/* Row 1: Task code + status */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono text-[9px] font-extrabold uppercase tracking-widest ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                            {task.taskCode}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isOverdue && (
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                OVERDUE
                              </span>
                            )}
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              isSelected ? 'bg-white/20 text-white border-white/30' : statusStyle.badge
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : statusStyle.dot}`} />
                              {task.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Task title */}
                        <h4 className={`text-xs font-extrabold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {task.title}
                        </h4>

                        {/* Row 3: Priority + Due date */}
                        <div className={`flex items-center justify-between text-[10px] font-semibold pt-1.5 border-t ${
                          isSelected ? 'border-blue-500/50' : 'border-slate-100'
                        }`}>
                          <span className={`font-bold px-2 py-0.5 rounded-full border text-[9px] ${
                            isSelected ? 'bg-white/20 text-white border-white/30' : priorityMeta.style
                          }`}>
                            {task.priority || 'LOW'}
                          </span>
                          <span className={`flex items-center gap-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                            <Calendar size={10} />
                            <span className="font-mono">{task.dueDate || '--'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
                <span>Page {page + 1} / {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer bg-white">
                    <ChevronLeft size={13} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                    className="p-1 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer bg-white">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANE */}
        <div className="lg:col-span-2">
          {selectedTaskId ? (
            <TaskDetailsScreen embeddedTaskId={selectedTaskId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200/70 shadow-sm text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <ClipboardPlus size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">No task selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a task from the list on the left to view and manage its full details.</p>
            </div>
          )}
        </div>
      </div>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={handleCreateTask}
      />
    </div>
  );
};
