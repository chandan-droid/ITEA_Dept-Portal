import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../../core/api/projectApi';
import { useAuth } from '../authentication/AuthProvider';
import { Card } from '../../shared/components/Card';
import { CreateProjectModal } from './CreateProjectModal';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { 
  FolderPlus, Search, Filter, RotateCcw, LayoutDashboard, 
  Calendar, User, AlertCircle, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, CheckSquare, Clock
} from 'lucide-react';

export const ProjectsScreen = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'all'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [page, setPage] = useState(0);
  const [size] = useState(6); // Grid items per page
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState(null);

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const canCreate = hasPermission('PROJECT_CREATE');
  const canViewTeam = hasPermission('PROJECT_VIEW_TEAM');

  // Enforce tab security on load
  useEffect(() => {
    if (!canViewTeam && activeTab === 'all') {
      setActiveTab('my');
    }
  }, [canViewTeam]);

  // Load projects list
  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined
      };

      let response;
      if (activeTab === 'all') {
        response = await projectApi.getTeamProjects(params);
      } else {
        response = await projectApi.getMyProjects(params);
      }

      setProjects(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      console.error('Failed to load project list', err);
      setError(err.message || 'Access denied or server error');
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard metrics
  const loadDashboardStats = async () => {
    if (canViewTeam) {
      setLoadingDashboard(true);
      try {
        const stats = await projectApi.getDashboard();
        setDashboardStats(stats);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoadingDashboard(false);
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, [page, activeTab, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const handleCreateProject = async (payload) => {
    await projectApi.create(payload);
    loadProjects();
    loadDashboardStats();
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(0);
  };

  const getStatusStyle = (status) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' };
      case 'PLANNING':
        return { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
      case 'ON_HOLD':
        return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      case 'COMPLETED':
        return { badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
      case 'CANCELLED':
        return { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
      case 'ARCHIVED':
        return { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
      default:
        return { badge: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-500' };
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Project Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enterprise governance, schedules, milestones, and shared files.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="md-button-primary"
          >
            <FolderPlus size={18} /> Create Project
          </button>
        )}
      </div>

      {/* Dashboard Stats Panel (visible to managers/admins) */}
      {canViewTeam && dashboardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Total Projects</p>
              <h4 className="text-xl font-bold text-secondary-dark">{dashboardStats.totalProjects}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Active</p>
              <h4 className="text-xl font-bold text-secondary-dark">{dashboardStats.activeProjects}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <CheckSquare size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Completed</p>
              <h4 className="text-xl font-bold text-secondary-dark">{dashboardStats.completedProjects}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Overdue</p>
              <h4 className="text-xl font-bold text-rose-600">{dashboardStats.overdueProjects}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm col-span-2 lg:col-span-1 flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Upcoming Milestones</p>
              <h4 className="text-xl font-bold text-secondary-dark">{dashboardStats.upcomingMilestones}</h4>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Filters Panel */}
      <div className="bg-white p-4 rounded-large border border-gray-100 shadow-sm space-y-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('my'); setPage(0); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'my'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              My Projects
            </button>
            {canViewTeam && (
              <button
                onClick={() => { setActiveTab('all'); setPage(0); }}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                All Team Projects
              </button>
            )}
          </div>
          
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> Clear Filters
          </button>
        </div>

        {/* Input Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <Filter size={16} />
            </span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

      </div>

      {/* Projects Grid List */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Loading project workspace...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-large flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white py-16 text-center rounded-large border border-gray-100 shadow-sm">
          <span className="material-symbols-outlined text-[64px] text-gray-300 mb-3">folder_open</span>
          <h3 className="text-lg font-bold text-gray-700">No Projects Found</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Try adjusting search inputs, changing tabs, or create a new project workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const { badge: badgeClass, dot: dotClass } = getStatusStyle(project.status);
              
              return (
                <div
                  key={project.projectId}
                  onClick={() => navigate(`/projects/${project.projectId}`)}
                  className="bg-white border border-gray-200 rounded-large p-5 hover:translate-y-[-2px] hover:shadow-lg hover:border-accent/20 cursor-pointer transition-all duration-300 flex flex-col group h-[260px] justify-between shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Code & Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gray-400 tracking-wider">
                        {project.projectCode}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${badgeClass}`}>
                        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${dotClass}`} />
                        {project.status}
                      </span>
                    </div>

                    {/* Name */}
                    <div>
                      <h3 className="font-bold text-secondary-dark group-hover:text-accent transition-colors text-base line-clamp-1">
                        {project.projectName}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1 font-medium">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress & Metadata */}
                  <div className="space-y-4 pt-3 border-t border-gray-50">
                    
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-secondary-dark">{project.progressPercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Manager & Timeline */}
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <span className="truncate max-w-[120px]">{project.ownerName}</span>
                      </div>
                      {project.plannedEndDate && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>Due {project.plannedEndDate}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-large border border-gray-100 shadow-sm text-xs font-semibold text-gray-500 select-none">
              <div>
                Showing page <span className="text-secondary-dark">{page + 1}</span> of <span className="text-secondary-dark">{totalPages}</span> ({totalElements} total projects)
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages - 1}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSuccess={handleCreateProject}
      />

    </div>
  );
};
