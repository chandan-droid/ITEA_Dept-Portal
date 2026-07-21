import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { employeeApi } from '../../core/api/employeeApi';
import { projectApi } from '../../core/api/projectApi';
import { X, Loader2, ClipboardList, Calendar, User, FileText, AlertCircle, Plus, Folder } from 'lucide-react';

export const CreateTaskModal = ({ isOpen, onClose, onCreateSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load projects and employees on open
  useEffect(() => {
    if (isOpen) {
      const loadInitialData = async () => {
        setLoadingDropdowns(true);
        setError(null);
        try {
          // Fetch projects
          const projResponse = await projectApi.getTeamProjects({ page: 0, size: 200 });
          setProjects(projResponse.content || []);

          // Fetch all employees (for standalone tasks)
          const empResponse = await employeeApi.getAll({ page: 0, size: 200, status: 'ACTIVE' });
          setEmployees(empResponse.content || []);
        } catch (err) {
          console.error(err);
          setError('Failed to load projects or employees lists.');
        } finally {
          setLoadingDropdowns(false);
        }
      };
      loadInitialData();
    }
  }, [isOpen]);

  // Load project members when projectId changes to enforce FR-TASK-005
  useEffect(() => {
    if (projectId) {
      const loadMembers = async () => {
        setLoadingMembers(true);
        setSelectedAssignees([]); // Reset selection on project change
        try {
          const members = await projectApi.getMembers(projectId);
          setProjectMembers(members || []);
        } catch (err) {
          console.error(err);
          setError('Failed to load project members.');
        } finally {
          setLoadingMembers(false);
        }
      };
      loadMembers();
    } else {
      setProjectMembers([]);
    }
  }, [projectId]);

  const toggleAssignee = (userId) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setError('Due date must not be before the start date.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category.trim() || null,
        projectId: projectId ? parseInt(projectId, 10) : null,
        assigneeIds: selectedAssignees.map(id => parseInt(id, 10)),
        startDate: startDate || null,
        dueDate: dueDate || null
      };

      await onCreateSuccess(payload);

      // Reset Form
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setCategory('');
      setProjectId('');
      setSelectedAssignees([]);
      setStartDate('');
      setDueDate('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which list of assignees to show
  const assigneeOptions = projectId ? projectMembers.map(m => ({
    userId: m.userId,
    displayName: m.displayName || `Member #${m.userId}`,
    role: m.projectRole
  })) : employees.map(e => ({
    userId: e.userId,
    displayName: e.displayName,
    role: e.status
  }));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-large shadow-2xl overflow-hidden animate-fade-in z-10 border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-[#0080FF] rounded-xl">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-dark leading-none">Create Task</h3>
              <p className="text-xs text-gray-500 mt-1">Standalone or associated with a project</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Task Title *</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter task name or action item..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] focus:ring-4 focus:ring-blue-500/10 font-medium transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
            <textarea
              placeholder="Provide context, deliverables, or checklist instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] focus:ring-4 focus:ring-blue-500/10 font-medium transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] font-medium"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Category</label>
              <input
                type="text"
                placeholder="e.g. Design, Bug, Research, Backend"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Start Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] font-medium"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Due Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Project Association */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Project Association</label>
            <div className="relative">
              <Folder size={16} className="absolute left-3 top-3 text-gray-400" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loadingDropdowns}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0080FF] font-medium disabled:opacity-50"
              >
                <option value="">Standalone (No Project)</option>
                {projects.map(p => (
                  <option key={p.projectId} value={p.projectId}>
                    [{p.projectCode}] {p.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignees Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Assign Employees {projectId ? '(Project Members Only)' : ''}
              </label>
              <span className="text-xs text-gray-400 font-semibold">
                {selectedAssignees.length} selected
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl bg-slate-50 overflow-hidden">
              {loadingMembers || loadingDropdowns ? (
                <div className="flex items-center justify-center p-6 text-gray-500 text-sm gap-2 bg-white">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span>Loading members...</span>
                </div>
              ) : assigneeOptions.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm bg-white">
                  No eligible assignees found.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white">
                  {assigneeOptions.map(option => {
                    const isChecked = selectedAssignees.includes(option.userId);
                    return (
                      <label 
                        key={option.userId} 
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAssignee(option.userId)}
                          className="w-4.5 h-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700">{option.displayName}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{option.role}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 border-t border-gray-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 bg-white hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2240] text-white hover:bg-[#1E3E62] font-semibold text-sm disabled:opacity-60 transition-all cursor-pointer shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Create Task</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
