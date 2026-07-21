import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi } from '../../core/api/taskApi';
import { projectApi } from '../../core/api/projectApi';
import { useAuth } from '../authentication/AuthProvider';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { useDebounce } from '../../shared/hooks/useDebounce';
import {
  ClipboardPlus, Search, Filter, RotateCcw,
  Calendar, User, AlertCircle, ChevronLeft, ChevronRight,
  ShieldAlert, Loader2
} from 'lucide-react';

export const TasksScreen = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'team'
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [archivedFilter, setArchivedFilter] = useState(false);

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState(null);

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const canCreate = hasPermission('TASK_CREATE');
  const canViewTeam = hasPermission('TASK_VIEW_TEAM');

  // Enforce tab security on load
  useEffect(() => {
    if (!canViewTeam && activeTab === 'team') {
      setActiveTab('my');
    }
  }, [canViewTeam]);

  // Auto-select 1st task in list whenever tasks array changes
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      if (!selectedTaskId || !tasks.some(t => t.taskId === selectedTaskId)) {
        setSelectedTaskId(tasks[0].taskId);
      }
    } else {
      setSelectedTaskId(null);
    }
  }, [tasks]);

  // Load projects list for the filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectApi.getTeamProjects({ page: 0, size: 200 });
        setProjects(res.content || []);
      } catch (err) {
        console.error('Failed to load project filter options', err);
      }
    };
    fetchProjects();
  }, []);

  // Load tasks list
  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter ? parseInt(projectFilter, 10) : undefined,
        overdue: overdueFilter || undefined,
        archived: archivedFilter || undefined,
        sortBy: 'taskId',
        sortDirection: 'DESC'
      };

      let response;
      if (activeTab === 'team') {
        response = await taskApi.getTeamTasks(params);
      } else {
        response = await taskApi.getMyTasks(params);
      }

      setTasks(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      console.error('Failed to load task list', err);
      setError(err.message || 'Access denied or server error');
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard metrics
  const loadDashboardStats = async () => {
    try {
      const stats = await taskApi.getDashboard();
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, activeTab, debouncedSearch, statusFilter, priorityFilter, projectFilter, overdueFilter, archivedFilter]);

  useEffect(() => {
    loadDashboardStats();
  }, [activeTab]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const handleCreateTask = async (payload) => {
    await taskApi.create(payload);
    setPage(0);
    loadTasks();
    loadDashboardStats();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
    setOverdueFilter(false);
    setArchivedFilter(false);
    setPage(0);
  };

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'TODO':
        return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
      case 'IN_PROGRESS':
        return { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
      case 'ON_HOLD':
      case 'BLOCKED':
        return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      case 'UNDER_REVIEW':
      case 'IN_REVIEW':
        return { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
      case 'COMPLETED':
      case 'APPROVED':
        return { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' };
      case 'CANCELLED':
        return { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
      case 'ARCHIVED':
        return { badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
      default:
        return { badge: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-500' };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'HIGH':
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'MEDIUM':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-5 select-none animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="md-button-primary cursor-pointer"
          >
            <ClipboardPlus size={16} /> Create Task
          </button>
        )}
      </div>

      {/* Tabs & Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-large border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 text-xs font-bold">
            <button
              onClick={() => { setActiveTab('my'); setPage(0); }}
              className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${activeTab === 'my'
                  ? 'border-[#0080FF] text-[#0080FF]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              My Assigned Tasks
            </button>
            {canViewTeam && (
              <button
                onClick={() => { setActiveTab('team'); setPage(0); }}
                className={`px-4 py-2 border-b-2 transition-all cursor-pointer ${activeTab === 'team'
                    ? 'border-[#0080FF] text-[#0080FF]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                All Team Tasks
              </button>
            )}
          </div>

          {/* Quick Search & Filters */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#0080FF] font-medium"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#0080FF] font-medium"
            >
              <option value="">Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#0080FF] font-medium max-w-[140px] truncate"
            >
              <option value="">Project</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  [{p.projectCode}] {p.projectName}
                </option>
              ))}
            </select>

            {(search || priorityFilter || projectFilter || statusFilter || overdueFilter || archivedFilter) && (
              <button
                onClick={resetFilters}
                className="p-1.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 1/3 and 2/3 Master-Detail Split Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Left Pane (1/3 Width): Task List Window */}
        <div className="lg:col-span-1 space-y-3 bg-white p-3.5 rounded-large border border-gray-100 shadow-sm">
          
          {/* Header & Status Count Metric Pills (Figma style above list window) */}
          <div className="space-y-2.5 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-secondary-dark uppercase tracking-wider">Active Tasks</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {totalElements} Total
              </span>
            </div>

            {/* Compact Metric Count Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-bold no-scrollbar">
              <button
                onClick={() => { setStatusFilter(''); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === ''
                    ? 'bg-[#0080FF] text-white border-[#0080FF] shadow-xs'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                All <span>({dashboardStats?.totalTasks || 0})</span>
              </button>

              <button
                onClick={() => { setStatusFilter('TODO'); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'TODO'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                To Do <span>({dashboardStats?.tasksByStatus?.TODO || 0})</span>
              </button>

              <button
                onClick={() => { setStatusFilter('IN_PROGRESS'); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                In Progress <span>({dashboardStats?.tasksByStatus?.IN_PROGRESS || 0})</span>
              </button>

              <button
                onClick={() => { setStatusFilter('UNDER_REVIEW'); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'UNDER_REVIEW'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                Review <span>({dashboardStats?.tasksByStatus?.UNDER_REVIEW || 0})</span>
              </button>

              <button
                onClick={() => { setStatusFilter('COMPLETED'); setPage(0); }}
                className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                Done <span>({dashboardStats?.tasksByStatus?.COMPLETED || 0})</span>
              </button>
            </div>
          </div>

          {/* Task List Items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={28} className="animate-spin text-[#0080FF] mb-2" />
              <p className="text-xs font-semibold">Loading tasks...</p>
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs font-semibold">
              No tasks match active filter selection.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {tasks.map(task => {
                const statusStyle = getStatusStyle(task.status);
                const isSelected = task.taskId === selectedTaskId;
                const isTaskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['COMPLETED', 'APPROVED', 'ARCHIVED', 'CANCELLED'].includes(task.status?.toUpperCase());

                return (
                  <div
                    key={task.taskId}
                    onClick={() => setSelectedTaskId(task.taskId)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2 relative ${
                      isSelected
                        ? 'bg-blue-50/40 border-[#0080FF] shadow-sm ring-2 ring-[#0080FF]/20'
                        : 'bg-white border-gray-200/80 hover:border-blue-300'
                    }`}
                  >
                    {/* Code & Badges */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0080FF] uppercase tracking-wider">{task.taskCode}</span>
                      <div className="flex items-center gap-1.5">
                        {isTaskOverdue && (
                          <span className="text-[8px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                            OVERDUE
                          </span>
                        )}
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle.badge} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {task.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-bold text-secondary-dark line-clamp-2 leading-snug">
                      {task.title}
                    </h4>

                    {/* Priority & Due Date */}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400 font-semibold border-t border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full border font-bold ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {task.dueDate || 'No due date'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Left Pane Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-semibold text-gray-500">
              <span>Page {page + 1} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="p-1 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer bg-white"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages - 1}
                  className="p-1 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer bg-white"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Pane (2/3 Width): Selected Task Details */}
        <div className="lg:col-span-2">
          {selectedTaskId ? (
            <TaskDetailsScreen embeddedTaskId={selectedTaskId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-large border border-gray-100 shadow-sm text-center p-8">
              <ClipboardPlus size={48} className="text-gray-300 mb-3 stroke-[1.5]" />
              <h3 className="text-base font-bold text-gray-700">No task selected</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">Select a task from the list on the left to view and manage its full details.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={handleCreateTask}
      />

    </div>
  );
};
