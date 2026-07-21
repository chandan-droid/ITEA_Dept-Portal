import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectApi } from '../../core/api/projectApi';
import { useAuth } from '../authentication/AuthProvider';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetailsScreen } from './ProjectDetailsScreen';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { 
  FolderPlus, Search, Calendar, Users, ArrowRight, Layers, CheckCircle2, Hourglass, CirclePause, CircleOff, Circle
} from 'lucide-react';

const STATUS_META = {
  ACTIVE:    { label: 'Active',    icon: CheckCircle2,  chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  PLANNING:  { label: 'Planning',  icon: Circle,         chip: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500'    },
  ON_HOLD:   { label: 'On Hold',   icon: CirclePause,    chip: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
  COMPLETED: { label: 'Completed', icon: CheckCircle2,   chip: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500'    },
  CANCELLED: { label: 'Cancelled', icon: CircleOff,      chip: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500'    },
};

const getStatusMeta = (status) => STATUS_META[(status || 'PLANNING').toUpperCase()] || { label: status, chip: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

export const ProjectsScreen = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('my');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(null);

  const [tabCounts, setTabCounts] = useState({ ALL: 0, ACTIVE: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const canCreate = hasPermission('PROJECT_CREATE');
  const canViewTeam = hasPermission('PROJECT_VIEW_TEAM');

  useEffect(() => {
    if (!canViewTeam && activeTab === 'all') setActiveTab('my');
  }, [canViewTeam]);

  const fetchTabCounts = async () => {
    try {
      const params = { page: 0, size: 500 };
      const res = activeTab === 'all'
        ? await projectApi.getTeamProjects(params)
        : await projectApi.getMyProjects(params);
      const list = res.content || [];
      const counts = { ALL: list.length, ACTIVE: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 };
      list.forEach(p => {
        const st = (p.status || '').toUpperCase();
        if (counts[st] !== undefined) counts[st]++;
      });
      setTabCounts(counts);
    } catch (e) { console.error(e); }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, size,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined
      };
      const response = activeTab === 'all'
        ? await projectApi.getTeamProjects(params)
        : await projectApi.getMyProjects(params);

      const list = response.content || [];
      setProjects(list);
      setTotalPages(response.totalPages || 0);

      if (!urlProjectId && list.length > 0 && window.innerWidth >= 1024) {
        navigate(`/projects/${list[0].projectId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Access denied or server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTabCounts(); }, [activeTab]);
  useEffect(() => { loadProjects(); }, [page, activeTab, debouncedSearch, statusFilter]);

  const handleCreateProject = async (payload) => {
    const created = await projectApi.create(payload);
    await fetchTabCounts();
    await loadProjects();
    if (created?.projectId) navigate(`/projects/${created.projectId}`);
  };

  const selectedProjectId = urlProjectId ? parseInt(urlProjectId, 10) : null;

  const STATUS_FILTER_OPTIONS = [
    { key: '', label: 'All', countKey: 'ALL' },
    { key: 'ACTIVE', label: 'Active', countKey: 'ACTIVE' },
    { key: 'PLANNING', label: 'Planning', countKey: 'PLANNING' },
    { key: 'ON_HOLD', label: 'On Hold', countKey: 'ON_HOLD' },
    { key: 'COMPLETED', label: 'Done', countKey: 'COMPLETED' },
  ];

  return (
    <div className="space-y-4 select-none animate-fade-in font-sans pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ─── LEFT MASTER PANE ───────────────────────────────────────────── */}
        <div className={`lg:col-span-4 ${urlProjectId ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4 space-y-3.5">

            {/* Top bar: tabs + new button */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 flex-1">
                <button
                  onClick={() => { setActiveTab('my'); setPage(0); setStatusFilter(''); }}
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${activeTab === 'my' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  My Projects
                </button>
                {canViewTeam && (
                  <button
                    onClick={() => { setActiveTab('all'); setPage(0); setStatusFilter(''); }}
                    className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${activeTab === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    All Projects
                  </button>
                )}
              </div>

              {canCreate && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  title="Create New Project"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-2xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <FolderPlus size={15} />
                  <span>New</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search project name or code..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status filter chips with counts */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {STATUS_FILTER_OPTIONS.map(st => {
                const count = tabCounts[st.countKey] || 0;
                const isActive = statusFilter === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => { setStatusFilter(st.key); setPage(0); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shrink-0 text-[10px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full leading-none ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ─── PROJECT CARD LIST ──────────────────────────────────────── */}
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5 scrollbar-none">
              {loading ? (
                <div className="py-16 text-center text-xs font-bold text-slate-400">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">No projects found.</div>
              ) : (
                projects.map(p => {
                  const isSelected = selectedProjectId === p.projectId;
                  const meta = getStatusMeta(p.status);
                  const endDate = p.plannedEndDate ? p.plannedEndDate.substring(5) : null;
                  const memberCount = p.memberCount ?? null;

                  return (
                    <div
                      key={p.projectId}
                      onClick={() => navigate(`/projects/${p.projectId}`)}
                      className={`group rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200'
                          : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Accent left stripe */}
                      {!isSelected && (
                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${meta.dot}`} />
                      )}

                      <div className="p-3.5 pl-4 space-y-2.5">
                        {/* Row 1: Code + Status Chip */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-mono text-[9px] font-extrabold uppercase tracking-widest ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                            {p.projectCode}
                          </span>
                          <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-white/20 text-white border-white/30'
                              : meta.chip
                          }`}>
                            {meta.label}
                          </span>
                        </div>

                        {/* Row 2: Project name */}
                        <h4 className={`font-extrabold text-xs leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {p.projectName}
                        </h4>

                        {/* Row 3: Meta footer */}
                        <div className={`flex items-center justify-between text-[10px] font-semibold pt-2 border-t ${
                          isSelected ? 'border-blue-500/50 text-blue-200' : 'border-slate-100 text-slate-500'
                        }`}>
                          <div className="flex items-center gap-1 truncate">
                            <span className="truncate max-w-[130px]">{p.ownerName || 'Manager'}</span>
                          </div>
                          {endDate && (
                            <div className={`flex items-center gap-1 shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                              <Calendar size={10} />
                              <span className="font-mono">{endDate}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected indicator arrow */}
                      {isSelected && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200">
                          <ArrowRight size={14} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT DETAIL PANE ──────────────────────────────────────────── */}
        <div className={`lg:col-span-8 ${!urlProjectId ? 'hidden lg:block' : 'block'}`}>
          <ProjectDetailsScreen
            embeddedProjectId={selectedProjectId}
            onBackToList={() => navigate('/projects')}
          />
        </div>
      </div>

      {isModalOpen && (
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
};
