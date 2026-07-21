import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskApi } from '../../core/api/taskApi';
import { employeeApi } from '../../core/api/employeeApi';
import { projectApi } from '../../core/api/projectApi';
import { useAuth } from '../authentication/AuthProvider';
import {
  ArrowLeft, Calendar, User, Users, CheckSquare, Trash2,
  Plus, MessageSquare, Paperclip, Activity, Edit2, Check, X,
  Loader2, AlertCircle, Play, CheckCircle, ShieldAlert, Archive, Trash, Lock,
  Clock, RotateCcw, UserPlus, ArrowRight
} from 'lucide-react';

export const TaskDetailsScreen = ({ embeddedTaskId }) => {
  const { taskId: paramTaskId } = useParams();
  const taskId = embeddedTaskId || paramTaskId;
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing state for Task details
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editCategory, setEditCategory] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Dropdown options
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);

  // Child sections states
  const [activeTab, setActiveTab] = useState('comments'); // 'comments', 'attachments', 'history'
  const [newComment, setNewComment] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [assigneeToAdd, setAssigneeToAdd] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Activity feed
  const [activities, setActivities] = useState([]);

  // Action status states
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Auto-dismiss alert notification bars after 5 seconds
  useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');

  const currentUserId = user?.userId || user?.id;
  const isCreator = currentUserId && task && (currentUserId === task.createdBy);
  const isAssignee = task?.assignees?.some(a => a.userId === currentUserId);
  const isManagerOrAdmin = hasPermission('TASK_UPDATE') || hasPermission('TASK_VIEW_TEAM');
  const isCreatorOrManager = isCreator || isManagerOrAdmin;
  const canDelete = hasPermission('TASK_DELETE') || hasPermission('TASK_DELETE_ANY');
  const canForceDelete = hasPermission('TASK_DELETE_ANY');
  const isArchived = task?.status?.toUpperCase() === 'ARCHIVED';

  // Workflow Action Handlers
  const handleStartWork = async () => {
    clearNotifications();
    try {
      await taskApi.startWork(taskId);
      await loadTaskDetails();
      setActionSuccess('Work started on task (status -> IN_PROGRESS).');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleSubmitReview = async () => {
    clearNotifications();
    try {
      await taskApi.submitReview(taskId);
      await loadTaskDetails();
      setActionSuccess('Task submitted for manager review (status -> UNDER_REVIEW).');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleApprove = async () => {
    clearNotifications();
    try {
      await taskApi.approve(taskId);
      await loadTaskDetails();
      setActionSuccess('Task approved and marked completed!');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleRequestChanges = async (e) => {
    if (e) e.preventDefault();
    clearNotifications();
    try {
      await taskApi.requestChanges(taskId, reviewComments);
      setShowRequestChangesModal(false);
      setReviewComments('');
      await loadTaskDetails();
      setActionSuccess('Changes requested. Task returned to IN_PROGRESS.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this task?')) return;
    clearNotifications();
    try {
      await taskApi.cancel(taskId);
      await loadTaskDetails();
      setActionSuccess('Task cancelled.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this completed task?')) return;
    clearNotifications();
    try {
      await taskApi.archive(taskId);
      await loadTaskDetails();
      setActionSuccess('Task archived.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleReopen = async () => {
    clearNotifications();
    try {
      await taskApi.reopen(taskId);
      await loadTaskDetails();
      setActionSuccess('Task reopened and set to TODO status.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleHold = async () => {
    clearNotifications();
    try {
      await taskApi.hold(taskId);
      await loadTaskDetails();
      setActionSuccess('Task put on hold (status -> ON_HOLD).');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleResumeWork = async () => {
    clearNotifications();
    try {
      await taskApi.resume(taskId);
      await loadTaskDetails();
      setActionSuccess('Task resumed (status -> IN_PROGRESS).');
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Load everything
  const loadTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskApi.getById(taskId);
      setTask(data);

      // Seed edit form values
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
      setEditPriority(data.priority || 'MEDIUM');
      setEditCategory(data.category || '');
      setEditStartDate(data.startDate || '');
      setEditDueDate(data.dueDate || '');

      // Load activities
      const actsResponse = await taskApi.getActivityLog({ taskId });
      setActivities(actsResponse.content || []);

      // If project task, load project members
      if (data.projectId) {
        const members = await projectApi.getMembers(data.projectId);
        setProjectMembers(members || []);
      } else {
        // Load all active employees for assignment
        const empResponse = await employeeApi.getAll({ page: 0, size: 200, status: 'ACTIVE' });
        setEmployees(empResponse.content || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Access Denied: You may not be assigned to this task or lack necessary permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  // Enforce permissions warning on alerts
  const clearNotifications = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  // ─── TASK UPDATE HANDLERS ────────────────────────────────────────────────
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (editStartDate && editDueDate && editDueDate < editStartDate) {
      setActionError('Due date must not be before the start date.');
      return;
    }
    clearNotifications();
    try {
      await taskApi.update(taskId, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        category: editCategory,
        startDate: editStartDate || null,
        dueDate: editDueDate || null
      });
      setIsEditing(false);
      await loadTaskDetails();
      setActionSuccess('Task details updated.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    clearNotifications();
    try {
      await taskApi.updateStatus(taskId, newStatus);
      await loadTaskDetails();
      setActionSuccess(`Task status changed to ${newStatus}.`);
    } catch (err) {
      setActionError(err.message);
    }
  };

  // ─── ASSIGNEES ────────────────────────────────────────────────────────────
  const handleAddAssignee = async (e) => {
    e.preventDefault();
    if (!assigneeToAdd) return;
    setAssignLoading(true);
    clearNotifications();
    try {
      await taskApi.assignUsers(taskId, [parseInt(assigneeToAdd, 10)]);
      setAssigneeToAdd('');
      await loadTaskDetails();
      setActionSuccess('Assignee added successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveAssignee = async (userId) => {
    if (!window.confirm('Remove this assignee from the task?')) return;
    clearNotifications();
    try {
      await taskApi.removeAssignee(taskId, userId);
      await loadTaskDetails();
      setActionSuccess('Assignee removed.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  // ─── COMMENTS ─────────────────────────────────────────────────────────────
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    clearNotifications();
    try {
      await taskApi.addComment(taskId, newComment.trim());
      setNewComment('');
      await loadTaskDetails();
      setActionSuccess('Comment posted.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment permanently?')) return;
    clearNotifications();
    try {
      await taskApi.deleteComment(taskId, commentId);
      await loadTaskDetails();
      setActionSuccess('Comment removed.');
    } catch (err) {
      await loadTaskDetails();
      setActionSuccess('Comment list updated.');
    }
  };

  // ─── ATTACHMENTS ──────────────────────────────────────────────────────────
  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    clearNotifications();
    try {
      await taskApi.uploadAttachment(taskId, file);
      await loadTaskDetails();
      setActionSuccess('File uploaded successfully.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (attachmentId, fileName) => {
    try {
      const blobData = await taskApi.downloadAttachment(taskId, attachmentId);
      const url = window.URL.createObjectURL(new Blob([blobData]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download file. ' + err.message);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    clearNotifications();
    try {
      await taskApi.deleteAttachment(taskId, attachmentId);
      await loadTaskDetails();
      setActionSuccess('Attachment deleted.');
    } catch (err) {
      await loadTaskDetails();
      setActionSuccess('Attachment list updated.');
    }
  };

  // ─── ARCHIVE, APPROVE, DELETE ────────────────────────────────────────────
  const handleArchiveTask = async () => {
    if (!window.confirm('Archive this task? It will mark it as read-only.')) return;
    clearNotifications();
    try {
      await taskApi.archive(taskId);
      await loadTaskDetails();
      setActionSuccess('Task archived successfully.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleApproveTask = async () => {
    clearNotifications();
    try {
      await taskApi.approve(taskId);
      await loadTaskDetails();
      setActionSuccess('Task approved.');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteTask = async () => {
    const confirmMsg = canForceDelete
      ? 'Force delete this task and ALL associated history/attachments?'
      : 'Delete this task permanently?';
    if (!window.confirm(confirmMsg)) return;

    try {
      if (canForceDelete) {
        await taskApi.forceDelete(taskId);
      } else {
        await taskApi.delete(taskId);
      }
      navigate('/tasks');
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400 bg-transparent">
        <Loader2 size={40} className="animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-semibold">Loading task specifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-large border border-gray-100 shadow-sm p-8">
        <ShieldAlert size={56} className="text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Access Restricted</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-lg">{error}</p>
        <button
          onClick={() => navigate('/tasks')}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-slate-100 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} /> Return to Tasks registry
        </button>
      </div>
    );
  }

  // Assignee dropdown lists based on project association
  const eligibleAssignees = (task.projectId ? projectMembers.map(m => ({
    userId: m.userId,
    displayName: m.displayName || `Member #${m.userId}`
  })) : employees.map(e => ({
    userId: e.userId,
    displayName: e.displayName
  }))).filter(opt => !task.assignees.some(a => a.userId === opt.userId));

  const statusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'TODO':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BLOCKED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IN_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'APPROVED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActivityConfig = (type) => {
    switch (type?.toUpperCase()) {
      case 'STATUS_CHANGED':
        return {
          icon: <Activity size={13} />,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200 shadow-sm',
          label: 'Status Updated'
        };
      case 'TASK_APPROVED':
        return {
          icon: <CheckCircle size={13} />,
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-200 shadow-sm',
          label: 'Task Approved'
        };
      case 'CHANGES_REQUESTED':
        return {
          icon: <Edit2 size={13} />,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          borderColor: 'border-amber-200 shadow-sm',
          label: 'Changes Requested'
        };
      case 'TASK_CANCELLED':
        return {
          icon: <X size={13} />,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-600',
          borderColor: 'border-rose-200 shadow-sm',
          label: 'Task Cancelled'
        };
      case 'TASK_ARCHIVED':
        return {
          icon: <Archive size={13} />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          label: 'Task Archived'
        };
      case 'TASK_REOPENED':
        return {
          icon: <RotateCcw size={13} />,
          bgColor: 'bg-indigo-50',
          textColor: 'text-indigo-600',
          borderColor: 'border-indigo-200 shadow-sm',
          label: 'Task Reopened'
        };
      case 'COMMENT_ADDED':
        return {
          icon: <MessageSquare size={13} />,
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200 shadow-sm',
          label: 'Comment Posted'
        };
      case 'COMMENT_DELETED':
        return {
          icon: <Trash2 size={13} />,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-500',
          borderColor: 'border-rose-100',
          label: 'Comment Removed'
        };
      case 'ATTACHMENT_UPLOADED':
        return {
          icon: <Paperclip size={13} />,
          bgColor: 'bg-cyan-50',
          textColor: 'text-cyan-600',
          borderColor: 'border-cyan-200 shadow-sm',
          label: 'Attachment Added'
        };
      case 'ATTACHMENT_DELETED':
        return {
          icon: <Trash2 size={13} />,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-500',
          borderColor: 'border-rose-100',
          label: 'Attachment Removed'
        };
      case 'ASSIGNEE_ADDED':
        return {
          icon: <UserPlus size={13} />,
          bgColor: 'bg-violet-50',
          textColor: 'text-violet-600',
          borderColor: 'border-violet-200 shadow-sm',
          label: 'Assignee Added'
        };
      case 'ASSIGNEE_REMOVED':
        return {
          icon: <User size={13} />,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-600',
          borderColor: 'border-slate-200',
          label: 'Assignee Removed'
        };
      default:
        return {
          icon: <Clock size={13} />,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-100',
          label: type?.toLowerCase()?.replace('_', ' ') || 'Activity Log'
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top Navbar Actions */}
      <div className="flex items-center justify-between">
        

        <div className="flex items-center gap-2">
          {/* Delete Task */}
          {!isArchived && canDelete && (
            <button
              onClick={handleDeleteTask}
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-semibold text-xs transition-all cursor-pointer"
            >
              <Trash2 size={14} /> Delete Task
            </button>
          )}
        </div>
      </div>

      {/* Action status notification */}
      {actionError && (
        <div className="flex items-start justify-between gap-2 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={clearNotifications} className="text-rose-400 hover:text-rose-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-start justify-between gap-2 p-3.5 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={clearNotifications} className="text-green-400 hover:text-green-600 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Main details panel split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Form Info, Checklist */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card: Core Task Specs */}
          <div className="bg-white rounded-large border border-gray-100 shadow-sm p-6 space-y-5">

            {/* Title / Header Mode */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[#0080FF] uppercase tracking-wider">{task.taskCode}</span>
                  {task.projectId && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                      Linked Project
                    </span>
                  )}
                  {isArchived && (
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Lock size={10} /> Archived / Read Only
                    </span>
                  )}
                </div>
                {!isEditing ? (
                  <h2 className="text-xl font-bold text-secondary-dark leading-tight">{task.title}</h2>
                ) : (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-secondary-dark w-full border-b border-gray-300 focus:outline-none focus:border-blue-500 py-1"
                    placeholder="Enter task title..."
                  />
                )}
              </div>

              {!isArchived && isManagerOrAdmin && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Description</label>
              {!isEditing ? (
                <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
                  {task.description || 'No description provided.'}
                </p>
              ) : (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#0080FF] resize-none"
                  rows={4}
                  placeholder="Task instructions..."
                />
              )}
            </div>

            {/* Inline Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Category</span>
                {!isEditing ? (
                  <span className="text-sm font-semibold text-gray-700">{task.category || 'N/A'}</span>
                ) : (
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-slate-50 border border-gray-200 p-1.5 rounded-lg focus:outline-none"
                  />
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Priority</span>
                {!isEditing ? (
                  <span className="text-sm font-semibold text-gray-700">{task.priority}</span>
                ) : (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-slate-50 border border-gray-200 p-1 rounded-lg focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Start Date</span>
                {!isEditing ? (
                  <span className="text-sm font-semibold text-gray-700">{task.startDate || 'N/A'}</span>
                ) : (
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-slate-50 border border-gray-200 p-1 rounded-lg focus:outline-none"
                  />
                )}
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Due Date</span>
                {!isEditing ? (
                  <span className="text-sm font-semibold text-gray-700">{task.dueDate || 'N/A'}</span>
                ) : (
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-slate-50 border border-gray-200 p-1 rounded-lg focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Editing Save/Cancel Row */}
            {isEditing && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  <X size={14} className="inline mr-1" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  <Check size={14} className="inline mr-1" /> Save Changes
                </button>
              </div>
            )}

          </div>

          {/* Child navigation tabs */}
          <div className="bg-white rounded-large border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="flex border-b border-gray-100 bg-slate-50 px-2">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'comments' ? 'border-[#0080FF] text-[#0080FF]' : 'border-transparent text-gray-400'
                  }`}
              >
                <MessageSquare size={14} /> Comments ({task.comments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'attachments' ? 'border-[#0080FF] text-[#0080FF]' : 'border-transparent text-gray-400'
                  }`}
              >
                <Paperclip size={14} /> Attachments ({task.attachments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeTab === 'history' ? 'border-[#0080FF] text-[#0080FF]' : 'border-transparent text-gray-400'
                  }`}
              >
                <Activity size={14} /> Activity Feed
              </button>
            </div>

            {/* Tab content panel */}
            <div className="p-5 flex-1">

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-5">
                  {/* Create Comment Form */}
                  {!isArchived && (
                    <form onSubmit={handleAddComment} className="flex gap-2.5 items-end">
                      <input
                        type="text"
                        placeholder="Share progress or post a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#0080FF] font-medium"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                      >
                        Send
                      </button>
                    </form>
                  )}

                  {/* Comments Thread list */}
                  {(!task.comments || task.comments.length === 0) ? (
                    <div className="py-8 text-center text-gray-400 text-xs font-semibold">
                      No comments posted.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {task.comments.map(c => {
                        const canDeleteComment = isManagerOrAdmin || (c.userId === user?.userId);
                        return (
                          <div key={c.commentId} className="flex items-start justify-between bg-slate-50/60 p-3 border border-slate-100 rounded-xl gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                <span className="text-secondary-dark">{c.displayName}</span>
                                <span>•</span>
                                <span>{new Date(c.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-xs font-medium text-gray-700">{c.comment}</p>
                            </div>
                            {canDeleteComment && (
                              <button
                                onClick={() => handleDeleteComment(c.commentId)}
                                className="p-1 hover:bg-rose-100 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Upload file triggers */}
                  {!isArchived && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-xs font-bold text-slate-500">Upload Project Documents</div>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-[#0080FF] hover:bg-blue-50/50 cursor-pointer shadow-sm">
                        {uploadingFile ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip size={13} />
                            <span>Attach File</span>
                          </>
                        )}
                        <input
                          type="file"
                          onChange={handleUploadFile}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Attachment Lists */}
                  {(!task.attachments || task.attachments.length === 0) ? (
                    <div className="py-8 text-center text-gray-400 text-xs font-semibold">
                      No attachments uploaded.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {task.attachments.map(att => (
                        <div key={att.attachmentId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#0080FF]/30 transition-all select-none">
                          <div
                            onClick={() => handleDownloadFile(att.attachmentId, att.fileName)}
                            className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
                          >
                            <div className="p-2 bg-blue-50 text-[#0080FF] rounded-lg">
                              <Paperclip size={14} />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-500">{att.fileName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Uploaded by {att.uploaderName}</p>
                            </div>
                          </div>
                          {!isArchived && (
                            <button
                              onClick={() => handleDeleteAttachment(att.attachmentId)}
                              className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audit History / Activity Feed Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4 py-1">
                  {activities.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs font-semibold">
                      <Clock size={32} className="mx-auto text-gray-300 mb-2 stroke-[1.5]" />
                      No activity history recorded yet.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                      {activities.map(act => {
                        const cfg = getActivityConfig(act.activityType);
                        const userInitial = act.displayName?.charAt(0)?.toUpperCase() || 'U';
                        return (
                          <div key={act.activityId} className="relative group">
                            {/* Icon Badge Indicator */}
                            <div className={`absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} transition-transform group-hover:scale-110`}>
                              {cfg.icon}
                            </div>

                            {/* Activity Card */}
                            <div className="bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-2 transition-all shadow-xs">
                              {/* Header info */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-[#0080FF] font-extrabold text-[9px] flex items-center justify-center shrink-0">
                                    {userInitial}
                                  </div>
                                  <span className="text-xs font-bold text-secondary-dark">{act.displayName || 'System User'}</span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">
                                  {new Date(act.activityTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>

                              {/* State Transition details */}
                              {act.oldValue && act.newValue ? (
                                <div className="flex items-center gap-2 pt-1 text-xs">
                                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-md font-mono text-[10px] font-bold text-gray-600">
                                    {act.oldValue}
                                  </span>
                                  <ArrowRight size={12} className="text-gray-400 shrink-0" />
                                  <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md font-mono text-[10px] font-bold text-blue-700">
                                    {act.newValue}
                                  </span>
                                </div>
                              ) : act.newValue ? (
                                <div className="pt-1 text-xs text-gray-600 bg-white/80 p-2 rounded-lg border border-gray-100 font-medium">
                                  {act.newValue}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Right Column: Status updates, Assignees list */}
        <div className="space-y-6">

          {/* Card: Status Management (Transitions) */}
          <div className="bg-white rounded-large border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Active Status</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusStyle(task.status)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {task.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Lifecycle workflow actions */}
            <div className="space-y-2.5 pt-3.5 border-t border-gray-50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Workflow Actions</span>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. TODO */}
                {task.status === 'TODO' && (
                  <>
                    {isAssignee && (
                      <button
                        onClick={handleStartWork}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        <Play size={13} /> Start Work
                      </button>
                    )}
                    {isCreatorOrManager && (
                      <button
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        <X size={13} /> Cancel Task
                      </button>
                    )}
                  </>
                )}

                {/* 2. IN_PROGRESS */}
                {task.status === 'IN_PROGRESS' && (
                  <>
                    {isAssignee && (
                      <button
                        onClick={handleSubmitReview}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        <Activity size={13} /> Submit for Review
                      </button>
                    )}
                    {isCreatorOrManager && (
                      <>
                        <button
                          onClick={handleHold}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <AlertCircle size={13} /> Put On Hold
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <X size={13} /> Cancel Task
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* 3. ON_HOLD / BLOCKED */}
                {(task.status === 'ON_HOLD' || task.status === 'BLOCKED') && (
                  <>
                    {isCreatorOrManager ? (
                      <button
                        onClick={handleResumeWork}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        <Play size={13} /> Resume Work
                      </button>
                    ) : (
                      isAssignee && (
                        <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl text-center">
                          <p className="text-xs font-bold text-amber-700 flex items-center justify-center gap-1.5">
                            <AlertCircle size={14} /> Task is on hold (waiting for manager to resume)...
                          </p>
                        </div>
                      )
                    )}
                  </>
                )}

                {/* 4. UNDER_REVIEW / IN_REVIEW */}
                {(task.status === 'UNDER_REVIEW' || task.status === 'IN_REVIEW') && (
                  <>
                    {isCreatorOrManager && (
                      <>
                        <button
                          onClick={handleApprove}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => setShowRequestChangesModal(true)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <Edit2 size={13} /> Request Changes
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/50 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <X size={13} /> Cancel Task
                        </button>
                      </>
                    )}
                    {isAssignee && !isCreatorOrManager && (
                      <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl text-center">
                        <p className="text-xs font-bold text-purple-700 flex items-center justify-center gap-1.5">
                          <Activity size={14} /> Waiting for manager review...
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* 5. COMPLETED */}
                {task.status === 'COMPLETED' && (
                  <>
                    {isManagerOrAdmin ? (
                      <button
                        onClick={handleArchive}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                      >
                        <Archive size={13} /> Archive Task
                      </button>
                    ) : (
                      <div className="p-3 bg-green-50/80 border border-green-100 rounded-xl text-center">
                        <p className="text-xs font-bold text-green-700 flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} /> Completed ✔
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* 6. CANCELLED */}
                {task.status === 'CANCELLED' && isManagerOrAdmin && (
                  <button
                    onClick={handleReopen}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    <Play size={13} /> Reopen Task
                  </button>
                )}

                {/* 7. ARCHIVED */}
                {task.status === 'ARCHIVED' && (
                  <div className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5">
                      <Lock size={14} /> Archived (Read-Only)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Assignees and Reassignment */}
          <div className="bg-white rounded-large border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Assignees ({task.assignees?.length || 0})</span>
              <Users size={16} className="text-gray-400" />
            </div>

            {/* List of current assignees */}
            {(!task.assignees || task.assignees.length === 0) ? (
              <div className="py-4 text-center text-gray-400 text-xs font-semibold">
                No assignees mapped.
              </div>
            ) : (
              <div className="space-y-3.5">
                {task.assignees.map(a => (
                  <div key={a.userId} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-secondary-dark">{a.displayName}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{a.role || 'Member'}</p>
                    </div>
                    {!isArchived && isManagerOrAdmin && (
                      <button
                        onClick={() => handleRemoveAssignee(a.userId)}
                        className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reassign dropdown (Visible to managers only) */}
            {!isArchived && isManagerOrAdmin && eligibleAssignees.length > 0 && (
              <form onSubmit={handleAddAssignee} className="flex gap-2 pt-3 border-t border-gray-50">
                <select
                  value={assigneeToAdd}
                  onChange={(e) => setAssigneeToAdd(e.target.value)}
                  className="flex-1 text-xs font-semibold text-gray-700 bg-slate-50 border border-gray-200 p-2 rounded-xl focus:outline-none focus:border-[#0080FF]"
                >
                  <option value="">Select employee...</option>
                  {eligibleAssignees.map(opt => (
                    <option key={opt.userId} value={opt.userId}>
                      {opt.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!assigneeToAdd || assignLoading}
                  className="px-3.5 py-2 bg-blue-50 text-[#0080FF] hover:bg-blue-100 border border-blue-100 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {assignLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-secondary-dark flex items-center gap-2">
                <Edit2 size={18} className="text-amber-500" /> Request Changes
              </h3>
              <button
                onClick={() => setShowRequestChangesModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Please provide feedback explaining why changes are requested. This will return the task status to <strong className="text-blue-600">IN_PROGRESS</strong> and notify the assignees.
            </p>
            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Review Feedback / Comments
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="e.g. Please update unit tests and fix API response validation before completing."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#0080FF] focus:bg-white transition-all resize-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reviewComments.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Send Feedback & Request Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
