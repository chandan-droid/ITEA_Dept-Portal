import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi } from '../../core/api/projectApi';
import { employeeApi } from '../../core/api/employeeApi';
import { useAuth } from '../authentication/AuthProvider';
import { 
  ArrowLeft, ArrowRight, Calendar, User, AlignLeft, Target, 
  Settings, Users, Milestone, FileText, MessageSquare, 
  History, Plus, Trash2, CheckCircle2, Download, Upload,
  AlertCircle, ShieldAlert, Award, X, Edit3, Loader2, Save, BarChart2, Circle, CheckCircle, Clock, Mail, Shield, Send
} from 'lucide-react';

export const ProjectDetailsScreen = ({ embeddedProjectId, onBackToList }) => {
  const params = useParams();
  const projectId = embeddedProjectId || params.projectId;
  const navigate = useNavigate();
  const { hasPermission, user: loggedInUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sub-entity loading states
  const [members, setMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);

  // Active form sub-loaders
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modals States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);

  // Form Fields
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editObj, setEditObj] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('TEAM_MEMBER');
  const [employees, setEmployees] = useState([]);

  const [newMsName, setNewMsName] = useState('');
  const [newMsDesc, setNewMsDesc] = useState('');
  const [newMsTarget, setNewMsTarget] = useState('');

  const [newComment, setNewComment] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Resolve Permissions
  const canUpdate = hasPermission('PROJECT_UPDATE');
  const canDelete = hasPermission('PROJECT_DELETE');
  const canManageMembers = hasPermission('PROJECT_MANAGE_MEMBERS');
  const canChangeStatus = hasPermission('PROJECT_CHANGE_STATUS');
  const canArchive = hasPermission('PROJECT_ARCHIVE');
  const canAssignManager = hasPermission('PROJECT_ASSIGN_MANAGER');
  const canUploadDoc = hasPermission('PROJECT_DOCUMENT_UPLOAD');
  const canDeleteDoc = hasPermission('PROJECT_DOCUMENT_DELETE');
  const canCreateComment = hasPermission('PROJECT_COMMENT_CREATE');
  const canDeleteComment = hasPermission('PROJECT_COMMENT_DELETE');
  const canExportReport = hasPermission('PROJECT_REPORT_EXPORT');

  // Fetch Details
  const fetchDetails = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectApi.getById(projectId);
      setProjectDetails(data.project);
      setMembers(data.members || []);
      setMilestones(data.milestones || []);
      setStats(data.statistics);
      setActivities(data.recentActivities || []);

      setEditName(data.project.projectName);
      setEditDesc(data.project.description || '');
      setEditObj(data.project.objectives || '');
      setEditStart(data.project.plannedStartDate || '');
      setEditEnd(data.project.plannedEndDate || '');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch project workspace details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (activeTab === 'documents') loadDocuments();
    else if (activeTab === 'comments') loadComments();
    else if (activeTab === 'activities') loadActivities();
  }, [activeTab, projectId]);

  // Handlers
  const loadDocuments = async () => {
    try {
      const docs = await projectApi.getDocuments(projectId);
      setDocuments(docs);
    } catch (err) { console.error(err); }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.uploadDocument(projectId, uploadFile);
      setUploadFile(null);
      if (document.getElementById('fileInput')) document.getElementById('fileInput').value = '';
      await loadDocuments();
      await refreshStats();
      setActionSuccess('File uploaded successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to upload document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete document?')) return;
    try {
      await projectApi.deleteDocument(projectId, docId);
      await loadDocuments();
      await refreshStats();
    } catch (err) { alert(err.message); }
  };

  const handleDownloadDoc = (docId) => {
    const token = localStorage.getItem('access_token');
    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/projects/${projectId}/documents/${docId}?access_token=${token}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.click();
  };

  const loadComments = async () => {
    try {
      const data = await projectApi.getComments(projectId);
      setComments(data);
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setActionLoading(true);
    try {
      await projectApi.addComment(projectId, newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete comment?')) return;
    try {
      await projectApi.deleteComment(projectId, commentId);
      await loadComments();
    } catch (err) { alert(err.message); }
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!newMsName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.createMilestone(projectId, {
        milestoneName: newMsName.trim(),
        description: newMsDesc.trim() || null,
        targetDate: newMsTarget || null
      });
      setNewMsName('');
      setNewMsDesc('');
      setNewMsTarget('');
      setIsAddMilestoneOpen(false);
      await fetchMilestones();
      await refreshStats();
      setActionSuccess('Milestone added successfully.');
    } catch (err) { setActionError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleCompleteMilestone = async (msId) => {
    try {
      await projectApi.completeMilestone(projectId, msId);
      await fetchMilestones();
      await refreshStats();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteMilestone = async (msId) => {
    if (!window.confirm('Delete milestone?')) return;
    try {
      await projectApi.deleteMilestone(projectId, msId);
      await fetchMilestones();
      await refreshStats();
    } catch (err) { alert(err.message); }
  };

  const fetchMilestones = async () => {
    try {
      const data = await projectApi.getMilestones(projectId);
      setMilestones(data);
    } catch (err) { console.error(err); }
  };

  const loadEmployeesList = async () => {
    try {
      const response = await employeeApi.getAll({ page: 0, size: 200, status: 'ACTIVE' });
      setEmployees(response.content || []);
    } catch (err) { console.error(err); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.addMembers(projectId, [{ userId: parseInt(newMemberId, 10), projectRole: newMemberRole }]);
      setNewMemberId('');
      setIsAddMemberOpen(false);
      await refreshMembers();
      await refreshStats();
      setActionSuccess('Member added successfully.');
    } catch (err) { setActionError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleRemoveMember = async (memId) => {
    if (!window.confirm('Remove member?')) return;
    try {
      await projectApi.removeMember(projectId, memId);
      await refreshMembers();
      await refreshStats();
    } catch (err) { alert(err.message); }
  };

  const refreshMembers = async () => {
    try {
      const data = await projectApi.getMembers(projectId);
      setMembers(data);
    } catch (err) { console.error(err); }
  };

  const loadActivities = async () => {
    try {
      const logs = await projectApi.getActivities(projectId);
      setActivities(logs);
    } catch (err) { console.error(err); }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.update(projectId, {
        projectName: editName.trim(),
        description: editDesc.trim() || null,
        objectives: editObj.trim() || null,
        plannedStartDate: editStart || null,
        plannedEndDate: editEnd || null
      });
      setIsEditOpen(false);
      await fetchDetails();
      setActionSuccess('Project updated successfully.');
    } catch (err) { setActionError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleStatusChange = async (status) => {
    setActionLoading(true);
    try {
      await projectApi.changeStatus(projectId, status);
      await fetchDetails();
      setActionSuccess('Project status changed to ' + status);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete this project workspace?')) return;
    try {
      await projectApi.delete(projectId);
      if (onBackToList) onBackToList();
      else navigate('/projects');
    } catch (err) { alert(err.message); }
  };

  const handleExportReport = async (format) => {
    try {
      const content = await projectApi.exportReport(projectId, format);
      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const extension = format === 'pdf' ? 'pdf' : 'csv';
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `project-${projectDetails.projectCode}-report.${extension}`;
      link.click();
    } catch (err) { alert('Export failed: ' + err.message); }
  };

  const refreshStats = async () => {
    try {
      const statistics = await projectApi.getStatistics(projectId);
      setStats(statistics);
    } catch (err) { console.error(err); }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!projectId) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <BarChart2 size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-900">Select a Project Workspace</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Choose any project from the left panel to inspect milestones, core team directory, shared files, and discussion activity.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs min-h-[500px]">
        <Loader2 size={36} className="animate-spin text-blue-600" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Workspace...</span>
      </div>
    );
  }

  if (error || !projectDetails) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-16 text-center">
        <div className="bg-rose-50 text-rose-800 border border-rose-200 p-5 rounded-2xl">
          <p className="font-bold text-sm">{error || 'Project workspace details not found'}</p>
        </div>
        {onBackToList && (
          <button onClick={onBackToList} className="py-2.5 px-4 bg-slate-900 text-white rounded-xl font-bold text-xs">
            Back to Project Directory
          </button>
        )}
      </div>
    );
  }

  const isArchived = projectDetails.archived || 'ARCHIVED' === projectDetails.status;
  const isManagerOrAdmin = projectDetails.ownerId === loggedInUser?.userId || canUpdate;
  const progressPct = stats?.progress ?? 0;

  return (
    <div className="space-y-5 select-none animate-fade-in font-sans">
      
      {/* ─── HERO WORKSPACE CARD WITH EDIT & DELETE AT TOP ─────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 lg:p-6 space-y-5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <BarChart2 size={22} />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {projectDetails.projectName}
                </h2>
                <span className="bg-blue-600 text-white text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full uppercase shadow-2xs">
                  {(projectDetails.status || 'PLANNING').replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-400">
                CODE: {projectDetails.projectCode} • OWNER: {projectDetails.ownerName || 'Department Admin'}
              </p>
            </div>
          </div>

          {/* Right Header Section: EDIT & DELETE Options at Top + Progress Ring */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {isManagerOrAdmin && !isArchived && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-extrabold border border-blue-200/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Edit Project Details"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
                {canDelete && (
                  <button
                    onClick={handleDeleteProject}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold border border-rose-200/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Delete Project Workspace"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}

            {/* Progress Gauge */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 px-3 rounded-2xl border border-slate-100">
              <div className="text-right">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Progress</div>
                <div className="text-lg font-black text-blue-600 font-mono">{progressPct}%</div>
              </div>

              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 transform -rotate-90">
                  <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="3" className="text-slate-200" fill="transparent" />
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-blue-600 transition-all duration-700"
                    fill="transparent"
                    strokeDasharray={81}
                    strokeDashoffset={81 - (81 * progressPct) / 100}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-slate-100 pt-2 flex overflow-x-auto gap-1 scrollbar-none">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: AlignLeft },
            { id: 'milestones', label: 'TIMELINE', icon: Milestone },
            { id: 'members', label: 'MEMBERS', icon: Users },
            { id: 'documents', label: 'DOCUMENTS', icon: FileText },
            { id: 'comments', label: 'COMMENTS', icon: MessageSquare },
            { id: 'activities', label: 'ACTIVITIES', icon: History }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActionError(null); setActionSuccess(null); }}
                className={`px-4 py-2 font-extrabold text-[11px] tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer"><X size={14} /></button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* ─── TAB 1: OVERVIEW ───────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Project Summary</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {projectDetails.description || projectDetails.objectives || 'No project summary or description provided yet.'}
              </p>

              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">START DATE</div>
                  <div className="text-xs font-extrabold text-slate-800 mt-0.5 font-mono">{projectDetails.plannedStartDate || 'Not Specified'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">TARGET END</div>
                  <div className="text-xs font-extrabold text-slate-800 mt-0.5 font-mono">{projectDetails.plannedEndDate || 'Not Specified'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-sm text-slate-900">Key Milestones</h3>
                <button onClick={() => setActiveTab('milestones')} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">View All</button>
              </div>

              <div className="space-y-2">
                {milestones.length === 0 ? (
                  <div className="py-6 text-center text-xs font-bold text-slate-400">No milestones configured yet.</div>
                ) : (
                  milestones.slice(0, 4).map(ms => {
                    const isCompleted = ms.status === 'COMPLETED';
                    return (
                      <div key={ms.milestoneId} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[18px] ${isCompleted ? 'text-blue-600' : 'text-slate-300'}`}>
                            {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className={`font-bold ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {ms.milestoneName}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-500">{ms.targetDate || '--'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Core Team</h3>
              {members.length === 0 ? (
                <div className="text-xs font-bold text-slate-400 py-1">No team members assigned yet.</div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 overflow-hidden p-1">
                    {members.slice(0, 4).map((m, idx) => (
                      <div key={m.projectMemberId || idx} className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white shadow-2xs" title={m.displayName}>
                        {(m.displayName || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  {members.length > 4 && (
                    <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-2.5 py-1 rounded-full border border-slate-200/60">
                      +{members.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Recent Activity</h3>
              {activities.length === 0 ? (
                <div className="py-4 text-center text-xs font-bold text-slate-400">No activity history logged.</div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-2.5 pl-4 space-y-4 text-xs">
                  {activities.slice(0, 3).map((act, i) => (
                    <div key={act.activityId || i} className="relative">
                      <span className={`absolute w-2.5 h-2.5 rounded-full -left-[21px] top-1 ${i === 0 ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-300'}`} />
                      <div className="font-bold text-slate-800">{act.userDisplayName} {act.activityType?.toLowerCase()}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.activityTime ? act.activityTime.replace('T', ' ').substring(0, 16) : 'Recently'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── View Tasks Pointer Banner ──────────────────────────── */}
            <button
              onClick={() => navigate(`/tasks?projectId=${projectId}`)}
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="text-left">
                <div className="text-xs font-extrabold">Project Task Board</div>
                <div className="text-[10px] text-blue-200 mt-0.5">View all tasks linked to this project</div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                Tasks <ArrowRight size={13} />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* ─── TAB 2: MILESTONES ──────────────────────────────────────────────── */}
      {activeTab === 'milestones' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Project Milestones Schedule</h3>
              <p className="text-xs text-slate-400">Key targets and completion status</p>
            </div>
            {canUpdate && !isArchived && (
              <button onClick={() => setIsAddMilestoneOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer">
                <Plus size={14} /> Add Milestone
              </button>
            )}
          </div>

          <div className="space-y-3">
            {milestones.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-10">No milestones configured for this project.</p>
            ) : (
              milestones.map(ms => {
                const isCompleted = ms.status === 'COMPLETED';
                return (
                  <div key={ms.milestoneId} className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/60 border-slate-100'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[22px] ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isCompleted ? 'check_circle' : 'flag'}
                      </span>
                      <div>
                        <h4 className={`font-bold text-xs ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{ms.milestoneName}</h4>
                        {ms.description && <p className="text-[11px] text-slate-500 mt-0.5">{ms.description}</p>}
                        <div className="text-[10px] font-mono text-slate-400 font-bold mt-1">Target: {ms.targetDate || 'TBD'}</div>
                      </div>
                    </div>

                    {canUpdate && !isArchived && (
                      <div className="flex gap-1.5">
                        {!isCompleted && (
                          <button onClick={() => handleCompleteMilestone(ms.milestoneId)} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer">
                            Complete
                          </button>
                        )}
                        <button onClick={() => handleDeleteMilestone(ms.milestoneId)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MEMBERS ─────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Project Member Directory</h3>
              <p className="text-xs text-slate-400">Assigned engineers, project leads, and collaborators</p>
            </div>
            {canManageMembers && !isArchived && (
              <button onClick={() => { setIsAddMemberOpen(true); loadEmployeesList(); }} className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer">
                <Plus size={14} /> Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">No members assigned to this workspace yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {members.map(m => (
                <div key={m.projectMemberId} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white transition-all space-y-3 shadow-2xs hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {(m.displayName || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-slate-900">{m.displayName}</h4>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Mail size={11} className="text-slate-400" />
                          <span className="truncate max-w-[140px]">{m.email || 'No email registered'}</span>
                        </div>
                      </div>
                    </div>

                    {canManageMembers && !isArchived && m.userId !== projectDetails.ownerId && (
                      <button onClick={() => handleRemoveMember(m.projectMemberId)} className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      {m.projectRole}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Joined: {m.joinedAt ? m.joinedAt.split('T')[0] : 'Recent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: DOCUMENTS ──────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Project Resources & Shared Files</h3>
              <p className="text-xs text-slate-400">Attached documents, technical specs, and diagrams</p>
            </div>
          </div>

          {canUploadDoc && !isArchived && (
            <form onSubmit={handleUploadDoc} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
              <input type="file" id="fileInput" onChange={(e) => setUploadFile(e.target.files[0])} className="text-xs font-semibold text-slate-600" />
              <button type="submit" disabled={!uploadFile || actionLoading} className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50">
                {actionLoading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          )}

          <div className="space-y-2 pt-1">
            {documents.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-10">No documents uploaded to this workspace yet.</p>
            ) : (
              documents.map(doc => (
                <div key={doc.documentId} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-600" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{doc.documentName}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{formatBytes(doc.fileSize)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleDownloadDoc(doc.documentId)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                      <Download size={15} />
                    </button>
                    {canDeleteDoc && !isArchived && (
                      <button onClick={() => handleDeleteDoc(doc.documentId)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: COMMENTS (DISPLAY REAL USER NAME) ────────────────────── */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">Discussion Feed</h3>

          {canCreateComment && !isArchived && (
            <form onSubmit={handleAddComment} className="space-y-2.5">
              <textarea
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Share project updates or questions with the team..."
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={actionLoading || !newComment.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer">
                  <Send size={13} /> Post Update
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3 pt-2">
            {comments.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-10">No discussion updates yet.</p>
            ) : (
              comments.map(c => {
                const author = members.find(m => m.userId === c.userId);
                const authorName = c.userDisplayName || c.userFullName || c.userName || (author ? author.displayName : (c.userId === loggedInUser?.userId ? (loggedInUser.displayName || 'You') : 'Team Member'));
                const initials = (authorName || 'U').substring(0, 2).toUpperCase();

                return (
                  <div key={c.commentId} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shadow-2xs">
                          {initials}
                        </div>
                        <span className="font-extrabold text-slate-900">{authorName}</span>
                        {c.userId === loggedInUser?.userId && (
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-0.2 rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{c.createdAt ? c.createdAt.replace('T', ' ').substring(0, 16) : 'Recently'}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed pl-9">{c.comment}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: ACTIVITIES ────────────────────────────────────────────── */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Project Activity Trail</h3>
            <p className="text-xs text-slate-400">Audit history of status changes, member actions, and milestone updates</p>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-5 text-xs pt-2">
            {activities.length === 0 ? (
              <div className="text-xs font-bold text-slate-400 py-8 -ml-5 text-center">No activity history logged for this workspace.</div>
            ) : (
              activities.map(act => (
                <div key={act.activityId} className="relative space-y-1">
                  <span className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[26px] top-1 ring-4 ring-blue-50" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900">{act.userDisplayName}</span>
                    <span className="bg-slate-100 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      {act.activityType}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 ml-auto">
                      {act.activityTime ? act.activityTime.replace('T', ' ').substring(0, 16) : 'Recently'}
                    </span>
                  </div>
                  {act.newValue && (
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 mt-1">
                      {act.newValue}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Update Project Details</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateProject} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Project Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Planned Start</label>
                  <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Planned End</label>
                  <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description</label>
                <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isAddMemberOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Team Member</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Employee</label>
                <select value={newMemberId} onChange={e => setNewMemberId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" required>
                  <option value="">-- Select Employee --</option>
                  {employees.filter(emp => !members.some(m => m.userId === emp.userId)).map(emp => (
                    <option key={emp.userId} value={emp.userId}>{emp.displayName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600">Cancel</button>
                <button type="submit" disabled={actionLoading || !newMemberId} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Add Member</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isAddMilestoneOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Project Milestone</h3>
              <button onClick={() => setIsAddMilestoneOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateMilestone} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Milestone Name *</label>
                <input type="text" value={newMsName} onChange={e => setNewMsName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" required />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Date</label>
                <input type="date" value={newMsTarget} onChange={e => setNewMsTarget(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddMilestoneOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600">Cancel</button>
                <button type="submit" disabled={actionLoading || !newMsName.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">Create Milestone</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
