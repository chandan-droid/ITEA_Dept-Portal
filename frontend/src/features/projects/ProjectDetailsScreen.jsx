import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi } from '../../core/api/projectApi';
import { employeeApi } from '../../core/api/employeeApi';
import { useAuth } from '../authentication/AuthProvider';
import { Card } from '../../shared/components/Card';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { 
  ArrowLeft, Calendar, User, AlignLeft, Target, 
  Settings, Users, Milestone, FileText, MessageSquare, 
  History, Plus, Trash2, CheckCircle2, Download, Upload,
  AlertCircle, ShieldAlert, Award, X, Edit3, Loader2, Save
} from 'lucide-react';

export const ProjectDetailsScreen = () => {
  const { projectId } = useParams();
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

  // Modals / Dropdowns States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isChangeManagerOpen, setIsChangeManagerOpen] = useState(false);

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
  const canViewReport = hasPermission('PROJECT_REPORT_VIEW');
  const canExportReport = hasPermission('PROJECT_REPORT_EXPORT');

  // Load project workspace details
  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectApi.getById(projectId);
      setProjectDetails(data.project);
      setMembers(data.members || []);
      setMilestones(data.milestones || []);
      setStats(data.statistics);
      setActivities(data.recentActivities || []);

      // Populate edit form values
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
    if (projectId) {
      fetchDetails();
    }
  }, [projectId]);

  // Load files, comments, and activities dynamically based on active tab selection
  useEffect(() => {
    if (!projectId) return;

    if (activeTab === 'documents') {
      loadDocuments();
    } else if (activeTab === 'comments') {
      loadComments();
    } else if (activeTab === 'activities') {
      loadActivities();
    }
  }, [activeTab, projectId]);

  // ─── DOCUMENTS HANDLERS ──────────────────────────────────────────────────
  const loadDocuments = async () => {
    try {
      const docs = await projectApi.getDocuments(projectId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.uploadDocument(projectId, uploadFile);
      setUploadFile(null);
      document.getElementById('fileInput').value = '';
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
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await projectApi.deleteDocument(projectId, docId);
      await loadDocuments();
      await refreshStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadDoc = (docId) => {
    // Open a direct link/iframe download targeting the API
    const token = localStorage.getItem('access_token');
    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/projects/${projectId}/documents/${docId}?access_token=${token}`;
    
    // We trigger download by creating anchor tag
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.click();
  };

  // ─── COMMENTS HANDLERS ───────────────────────────────────────────────────
  const loadComments = async () => {
    try {
      const data = await projectApi.getComments(projectId);
      setComments(data);
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── MILESTONES HANDLERS ─────────────────────────────────────────────────
  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!newMsName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        milestoneName: newMsName.trim(),
        description: newMsDesc.trim() || null,
        targetDate: newMsTarget || null
      };
      await projectApi.createMilestone(projectId, payload);
      setNewMsName('');
      setNewMsDesc('');
      setNewMsTarget('');
      setIsAddMilestoneOpen(false);
      await fetchMilestones();
      await refreshStats();
      setActionSuccess('Milestone added successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMilestone = async (msId) => {
    try {
      await projectApi.completeMilestone(projectId, msId);
      await fetchMilestones();
      await refreshStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMilestone = async (msId) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await projectApi.deleteMilestone(projectId, msId);
      await fetchMilestones();
      await refreshStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchMilestones = async () => {
    try {
      const data = await projectApi.getMilestones(projectId);
      setMilestones(data);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── MEMBERS HANDLERS ────────────────────────────────────────────────────
  const loadEmployeesList = async () => {
    try {
      const response = await employeeApi.getAll({ page: 0, size: 200, status: 'ACTIVE' });
      setEmployees(response.content || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = [{
        userId: parseInt(newMemberId, 10),
        projectRole: newMemberRole
      }];
      await projectApi.addMembers(projectId, payload);
      setNewMemberId('');
      setIsAddMemberOpen(false);
      await refreshMembers();
      await refreshStats();
      setActionSuccess('Project member added successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await projectApi.removeMember(projectId, memId);
      await refreshMembers();
      await refreshStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (memId, newRole) => {
    try {
      await projectApi.updateMemberRole(projectId, memId, newRole);
      await refreshMembers();
    } catch (err) {
      alert(err.message);
    }
  };

  const refreshMembers = async () => {
    try {
      const data = await projectApi.getMembers(projectId);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── ACTIVITIES HANDLERS ─────────────────────────────────────────────────
  const loadActivities = async () => {
    try {
      const logs = await projectApi.getActivities(projectId);
      setActivities(logs);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── PROJECT STATE HANDLERS ──────────────────────────────────────────────
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        projectName: editName.trim(),
        description: editDesc.trim() || null,
        objectives: editObj.trim() || null,
        plannedStartDate: editStart || null,
        plannedEndDate: editEnd || null
      };
      await projectApi.update(projectId, payload);
      setIsEditOpen(false);
      await fetchDetails();
      setActionSuccess('Project details updated successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    setActionLoading(true);
    try {
      await projectApi.changeStatus(projectId, status);
      await fetchDetails();
      setActionSuccess('Project status changed to ' + status);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Only completed projects can be archived. Archive project now?')) return;
    setActionLoading(true);
    try {
      await projectApi.archive(projectId);
      await fetchDetails();
      setActionSuccess('Project archived and marked as read-only.');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignManagerSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await projectApi.assignManager(projectId, parseInt(newMemberId, 10));
      setIsChangeManagerOpen(false);
      setNewMemberId('');
      await fetchDetails();
      setActionSuccess('Project manager reassigned successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('WARNING: This will permanently delete the project and all related documents, milestones, and comment threads. Proceed?')) return;
    try {
      await projectApi.delete(projectId);
      navigate('/projects');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportReport = async (format) => {
    try {
      const content = await projectApi.exportReport(projectId, format);
      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const extension = format === 'pdf' ? 'pdf' : 'csv';

      // Create a Blob from the raw byte content
      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `project-${projectDetails.projectCode}-report.${extension}`;
      link.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Helper utils
  const refreshStats = async () => {
    try {
      const statistics = await projectApi.getStatistics(projectId);
      setStats(statistics);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PLANNING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ON_HOLD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COMPLETED':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ARCHIVED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !projectDetails) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-10 select-none animate-fade-in">
        <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-large text-center">
          <p className="font-semibold text-sm">{error || 'Project workspace details not found'}</p>
        </div>
        <button onClick={() => navigate('/projects')} className="md-button-secondary w-full cursor-pointer">
          <ArrowLeft size={16} /> Back to Projects Directory
        </button>
      </div>
    );
  }

  const isArchived = projectDetails.archived || 'ARCHIVED' === projectDetails.status;
  const isManagerOrAdmin = projectDetails.ownerId === loggedInUser.userId || canUpdate;

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 hover:bg-gray-100 rounded-large text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-gray-400 tracking-wider">
                {projectDetails.projectCode}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${getStatusColor(projectDetails.status)}`}>
                {projectDetails.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-secondary-dark tracking-tight mt-0.5">
              {projectDetails.projectName}
            </h1>
          </div>
        </div>

        {/* Exporter Buttons */}
        {canExportReport && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExportReport('excel')}
              className="md-button-secondary text-xs py-2 px-3 flex items-center gap-1 cursor-pointer"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={() => handleExportReport('pdf')}
              className="md-button-secondary text-xs py-2 px-3 flex items-center gap-1 cursor-pointer"
            >
              <Download size={14} /> PDF Summary
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-green-50 text-green-800 border border-green-150 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-green-500 hover:text-green-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-100 rounded-t-large flex overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: AlignLeft },
          { id: 'members', label: 'Members', icon: Users },
          { id: 'milestones', label: 'Milestones', icon: Milestone },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'comments', label: 'Comments', icon: MessageSquare },
          { id: 'activities', label: 'Activity Trail', icon: History }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActionError(null); setActionSuccess(null); }}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all duration-150 shrink-0 cursor-pointer ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/50'
              }`}
            >
              <TabIcon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Workspace Area */}
      <div className="min-h-[400px]">

        {/* ─── TAB 1: OVERVIEW ───────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Details Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Project Summary">
                <div className="space-y-4 text-sm mt-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Objectives</h4>
                    <p className="text-secondary-dark font-medium leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                      {projectDetails.objectives || 'No objectives stated.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                    <p className="text-secondary-dark font-medium leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                      {projectDetails.description || 'No description listed.'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Schedule and Managers Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Workspace Settings">
                  <div className="space-y-3.5 mt-2">
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                      <span className="font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={14} /> Planned Start</span>
                      <span className="font-bold text-secondary-dark">{projectDetails.plannedStartDate || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                      <span className="font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={14} /> Planned End</span>
                      <span className="font-bold text-secondary-dark">{projectDetails.plannedEndDate || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                      <span className="font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={14} /> Actual Start</span>
                      <span className="font-bold text-secondary-dark">{projectDetails.actualStartDate || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-1">
                      <span className="font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={14} /> Actual End</span>
                      <span className="font-bold text-secondary-dark">{projectDetails.actualEndDate || '-'}</span>
                    </div>
                  </div>
                </Card>

                <Card title="Workspace Managers">
                  <div className="space-y-4 mt-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20">
                        PM
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400">Project Manager</p>
                        <h4 className="font-bold text-secondary-dark">{projectDetails.ownerName}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200">
                        CR
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400">Created By</p>
                        <h4 className="font-bold text-secondary-dark">{projectDetails.creatorName}</h4>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right statistics / action column */}
            <div className="space-y-6">
              {/* Progress Card */}
              {stats && (
                <Card title="Activity Progress">
                  <div className="space-y-4 mt-2">
                    {/* Circle Progress bar or linear */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-gray-400">Completion</span>
                        <span className="text-secondary-dark text-sm">{stats.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${stats.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 text-center">
                      <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <h4 className="text-xl font-extrabold text-secondary-dark">{stats.members}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Active Members</p>
                      </div>
                      <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <h4 className="text-xl font-extrabold text-secondary-dark">
                          {stats.completedMilestones}/{stats.milestones}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Milestones</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Manager Operations Panel */}
              {isManagerOrAdmin && !isArchived && (
                <Card title="Workspace Operations">
                  <div className="grid grid-cols-1 gap-2.5 mt-2">
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="md-button-secondary w-full py-2.5 text-xs flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={14} /> Update Project Details
                    </button>
                    
                    {canAssignManager && (
                      <button
                        onClick={() => { setIsChangeManagerOpen(true); loadEmployeesList(); }}
                        className="md-button-secondary w-full py-2.5 text-xs flex justify-center items-center gap-1 cursor-pointer"
                      >
                        <User size={14} /> Reassign Manager
                      </button>
                    )}

                    {canChangeStatus && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Update status
                        </label>
                        <select
                          value={projectDetails.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-secondary-dark focus:outline-none focus:border-accent"
                          disabled={actionLoading}
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="ACTIVE">Active</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    )}

                    {canArchive && 'COMPLETED' === projectDetails.status && (
                      <button
                        onClick={handleArchive}
                        className="w-full py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <Award size={14} /> Archive Project (Read-Only)
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={handleDeleteProject}
                        className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-650 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} /> Delete Project Workspace
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* Archived Status read-only block */}
              {isArchived && (
                <div className="p-4 bg-purple-50 border border-purple-150 rounded-large text-center flex flex-col items-center gap-2 shadow-sm animate-pulse-slow">
                  <ShieldAlert size={32} className="text-purple-700" />
                  <div>
                    <h3 className="font-bold text-purple-800 text-sm">Archived Project</h3>
                    <p className="text-[11px] text-purple-600 mt-0.5">
                      This workspace is locked and read-only. No further comments, documents, or status updates can be made.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: MEMBERS ────────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <Card
            title="Project Team Directory"
            actions={
              canManageMembers && !isArchived && (
                <button
                  onClick={() => { setIsAddMemberOpen(true); loadEmployeesList(); }}
                  className="md-button-primary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Add Member
                </button>
              )
            }
          >
            <div className="overflow-x-auto -mx-6 mt-2">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-3">Member Name</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3">Project Role</th>
                    <th className="px-6 py-3">Joined Date</th>
                    {canManageMembers && !isArchived && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((member) => (
                    <tr key={member.projectMemberId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-secondary-dark">{member.displayName}</td>
                      <td className="px-6 py-4 text-gray-500">{member.email || '-'}</td>
                      <td className="px-6 py-4 font-medium">
                        {canManageMembers && !isArchived && member.userId !== projectDetails.ownerId ? (
                          <select
                            value={member.projectRole}
                            onChange={(e) => handleRoleChange(member.projectMemberId, e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-secondary-dark"
                          >
                            <option value="TEAM_MEMBER">Team Member</option>
                            <option value="DEVELOPER">Developer</option>
                            <option value="QA">QA Tester</option>
                            <option value="TESTER">Tester</option>
                            <option value="DESIGNER">Designer</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.projectRole === 'MANAGER' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {member.projectRole}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                        {member.joinedAt ? member.joinedAt.split('T')[0] : '-'}
                      </td>
                      {canManageMembers && !isArchived && (
                        <td className="px-6 py-4 text-right">
                          {member.userId !== projectDetails.ownerId ? (
                            <button
                              onClick={() => handleRemoveMember(member.projectMemberId)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-semibold italic">Owner</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ─── TAB 3: MILESTONES ──────────────────────────────────────────────── */}
        {activeTab === 'milestones' && (
          <Card
            title="Project Milestones Schedule"
            actions={
              canUpdate && !isArchived && (
                <button
                  onClick={() => setIsAddMilestoneOpen(true)}
                  className="md-button-primary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Add Milestone
                </button>
              )
            }
          >
            <div className="space-y-4 mt-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10 font-semibold">
                  No milestones configured for this project.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {milestones.map((ms) => {
                    const isCompleted = ms.status === 'COMPLETED';
                    return (
                      <div
                        key={ms.milestoneId}
                        className={`flex items-start md:items-center justify-between p-4 border rounded-xl shadow-sm transition-all ${
                          isCompleted
                            ? 'bg-teal-50/20 border-teal-150'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl mt-0.5 md:mt-0 ${
                            isCompleted ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Milestone size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-bold text-sm ${isCompleted ? 'text-teal-800 line-through' : 'text-secondary-dark'}`}>
                                {ms.milestoneName}
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                isCompleted ? 'bg-teal-150 text-teal-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {ms.status}
                              </span>
                            </div>
                            {ms.description && (
                              <p className="text-xs text-gray-400 font-semibold mt-0.5">{ms.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-400 mt-2">
                              <span className="flex items-center gap-1"><Calendar size={12} /> Target: {ms.targetDate || '-'}</span>
                              {isCompleted && (
                                <span className="flex items-center gap-1 text-teal-600"><CheckCircle2 size={12} /> Completed: {ms.completedDate || '-'}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {canUpdate && !isArchived && (
                          <div className="flex gap-1.5">
                            {!isCompleted && (
                              <button
                                onClick={() => handleCompleteMilestone(ms.milestoneId)}
                                className="p-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                                title="Mark Completed"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMilestone(ms.milestoneId)}
                              className="p-1.5 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete Milestone"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ─── TAB 4: DOCUMENTS ──────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Upload Area */}
            {canUploadDoc && !isArchived && (
              <Card title="Upload Resource Document">
                <form onSubmit={handleUploadDoc} className="space-y-4 mt-2">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-accent/40 transition-colors flex flex-col items-center bg-gray-50/30">
                    <Upload size={32} className="text-gray-300 mb-2" />
                    <input
                      type="file"
                      id="fileInput"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="fileInput"
                      className="text-xs font-bold text-accent hover:underline cursor-pointer"
                    >
                      Choose file
                    </label>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-1">
                      {uploadFile ? uploadFile.name : 'No file selected'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="md-button-primary w-full text-xs py-2 cursor-pointer"
                    disabled={!uploadFile || actionLoading}
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Document
                  </button>
                </form>
              </Card>
            )}

            {/* Files List */}
            <div className={canUploadDoc && !isArchived ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <Card title="Project Resources">
                <div className="space-y-3.5 mt-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10 font-semibold">
                      No documents associated with this workspace.
                    </p>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.documentId}
                        className="flex items-center justify-between p-3.5 border border-gray-100 bg-gray-50/20 rounded-xl hover:border-accent/15 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-secondary-dark truncate max-w-[200px] md:max-w-[400px]">
                              {doc.documentName}
                            </h4>
                            <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                              {formatBytes(doc.fileSize)} • {doc.fileType || 'binary'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadDoc(doc.documentId)}
                            className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-accent rounded-lg transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={16} />
                          </button>
                          {canDeleteDoc && !isArchived && (
                            <button
                              onClick={() => handleDeleteDoc(doc.documentId)}
                              className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

          </div>
        )}

        {/* ─── TAB 5: DISCUSSION (COMMENTS) ──────────────────────────────────── */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            
            {/* Input Comment Box */}
            {canCreateComment && !isArchived && (
              <Card title="Add Discussion Comment">
                <form onSubmit={handleAddComment} className="space-y-3.5 mt-2">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or record project progress updates..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all resize-none"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="md-button-primary text-xs py-2 px-5 cursor-pointer"
                      disabled={actionLoading || !newComment.trim()}
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />} Post Comment
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* Comments Timeline */}
            <Card title="Discussion Feed">
              <div className="space-y-6 mt-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10 font-semibold">
                    No comments in this thread. Start the conversation!
                  </p>
                ) : (
                  comments.map((c) => {
                    const isAuthor = c.userId === loggedInUser.userId;
                    const canDeleteThisComment = isAuthor || canDeleteComment || projectDetails.ownerId === loggedInUser.userId;
                    
                    return (
                      <div key={c.commentId} className="flex items-start gap-3 text-sm group border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                          {c.userId === loggedInUser.userId ? 'ME' : 'U'}
                        </div>
                        {/* Content */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-secondary-dark">{c.userId === loggedInUser.userId ? 'You' : 'User ' + c.userId}</span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {c.createdAt ? c.createdAt.replace('T', ' ').substring(0, 16) : ''}
                              </span>
                            </div>
                            
                            {canDeleteThisComment && !isArchived && (
                              <button
                                onClick={() => handleDeleteComment(c.commentId)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-600 leading-relaxed font-medium bg-gray-50/30 p-3 rounded-xl border border-gray-100">{c.comment}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

          </div>
        )}

        {/* ─── TAB 6: ACTIVITY TRAIL ─────────────────────────────────────────── */}
        {activeTab === 'activities' && (
          <Card title="Project Activity Log">
            <div className="relative border-l border-gray-200 pl-5 ml-2.5 space-y-6 mt-4">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10 font-semibold -ml-5">
                  No activity history logged.
                </p>
              ) : (
                activities.map((act) => (
                  <div key={act.activityId} className="relative text-sm">
                    {/* Circle timeline connector */}
                    <span className="absolute w-3.5 h-3.5 bg-white border-2 border-accent rounded-full -left-[27.5px] top-0.5" />
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-secondary-dark">{act.activityType}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          {act.activityTime ? act.activityTime.replace('T', ' ').substring(0, 16) : ''}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-500">
                        Performed by: <span className="text-secondary-dark font-bold">{act.userDisplayName}</span>
                      </p>
                      {act.newValue && (
                        <p className="text-xs text-gray-400 font-medium bg-gray-50/50 p-2 rounded-lg border border-gray-100 mt-1.5 w-fit max-w-full">
                          Details: {act.newValue}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

      </div>


      {/* ─── MODAL 1: EDIT DETAILS ─────────────────────────────────────────── */}
      {isEditOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 z-10 border border-gray-100 flex flex-col max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-secondary-dark flex items-center gap-1.5"><Edit3 size={16} /> Update Project Details</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Planned Start</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Planned End</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Objectives</label>
                <textarea
                  rows={3}
                  value={editObj}
                  onChange={(e) => setEditObj(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditOpen(false)} className="md-button-secondary py-2">Cancel</button>
                <button type="submit" className="md-button-primary py-2 px-5 cursor-pointer" disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Details
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 2: REASSIGN MANAGER ─────────────────────────────────────── */}
      {isChangeManagerOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsChangeManagerOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border border-gray-100 animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-secondary-dark flex items-center gap-1.5"><User size={16} /> Reassign Project Manager</h2>
              <button onClick={() => setIsChangeManagerOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleAssignManagerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Designate Manager</label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  required
                >
                  <option value="">-- Select Active Project Member --</option>
                  {/* Business Rule: The new manager must already be a project member */}
                  {members.map((mem) => (
                    <option key={mem.userId} value={mem.userId}>
                      {mem.displayName} ({mem.projectRole})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">
                  * Note: Only active members of this project can be designated as the Project Manager.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsChangeManagerOpen(false)} className="md-button-secondary py-2">Cancel</button>
                <button type="submit" className="md-button-primary py-2 px-5 cursor-pointer" disabled={actionLoading || !newMemberId}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Assign Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 3: ADD MEMBER ───────────────────────────────────────────── */}
      {isAddMemberOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAddMemberOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border border-gray-100 animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-secondary-dark flex items-center gap-1.5"><Users size={16} /> Add Team Member</h2>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Select Employee</label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees
                    .filter(emp => !members.some(m => m.userId === emp.userId))
                    .map((emp) => (
                      <option key={emp.userId} value={emp.userId}>
                        {emp.displayName} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Role Designation</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  required
                >
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="QA">QA Tester</option>
                  <option value="TESTER">Tester</option>
                  <option value="DESIGNER">Designer</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddMemberOpen(false)} className="md-button-secondary py-2">Cancel</button>
                <button type="submit" className="md-button-primary py-2 px-5 cursor-pointer" disabled={actionLoading || !newMemberId}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL 4: ADD MILESTONE ────────────────────────────────────────── */}
      {isAddMilestoneOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAddMilestoneOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 border border-gray-100 animate-fade-in my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-secondary-dark flex items-center gap-1.5"><Milestone size={16} /> Add Project Milestone</h2>
              <button onClick={() => setIsAddMilestoneOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Milestone Name *</label>
                <input
                  type="text"
                  value={newMsName}
                  onChange={(e) => setNewMsName(e.target.value)}
                  placeholder="e.g. Requirements Review"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Date</label>
                <input
                  type="date"
                  value={newMsTarget}
                  onChange={(e) => setNewMsTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={newMsDesc}
                  onChange={(e) => setNewMsDesc(e.target.value)}
                  placeholder="Detail summary of milestone gates..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddMilestoneOpen(false)} className="md-button-secondary py-2">Cancel</button>
                <button type="submit" className="md-button-primary py-2 px-5 cursor-pointer" disabled={actionLoading || !newMsName.trim()}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
