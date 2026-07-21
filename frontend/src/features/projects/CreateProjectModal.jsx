import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { employeeApi } from '../../core/api/employeeApi';
import { X, Loader2, FolderPlus, Calendar, User, FileText, Target, AlertCircle } from 'lucide-react';

export const CreateProjectModal = ({ isOpen, onClose, onCreateSuccess }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load all employees to select project manager/owner
  useEffect(() => {
    if (isOpen) {
      const loadEmployees = async () => {
        setLoadingEmployees(true);
        setError(null);
        try {
          // Fetch users with large page size to ensure listing all
          const response = await employeeApi.getAll({ page: 0, size: 200, status: 'ACTIVE' });
          setEmployees(response.content || []);
        } catch (err) {
          console.error(err);
          setError('Failed to load employee list for project owner selection.');
        } finally {
          setLoadingEmployees(false);
        }
      };
      loadEmployees();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!ownerId) {
      setError('Project owner is required.');
      return;
    }
    if (plannedStartDate && plannedEndDate && plannedEndDate < plannedStartDate) {
      setError('Planned end date must be greater than or equal to planned start date.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        projectName: projectName.trim(),
        description: description.trim() || null,
        objectives: objectives.trim() || null,
        ownerId: parseInt(ownerId, 10),
        plannedStartDate: plannedStartDate || null,
        plannedEndDate: plannedEndDate || null,
      };
      await onCreateSuccess(payload);
      // Reset form
      setProjectName('');
      setDescription('');
      setObjectives('');
      setOwnerId('');
      setPlannedStartDate('');
      setPlannedEndDate('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-10 border border-gray-100 flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-[#0a2351] rounded-xl">
              <FolderPlus size={20} className="text-[#0080FF]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-secondary-dark">Create New Project</h2>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Initiate a new project with objectives & owner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/60 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          
          {/* Scrollable Fields */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Project Name</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <FolderPlus size={18} />
                </div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. DE-CGV4 Portal"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Planned Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar size={18} />
                  </div>
                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all"
                  />
                </div>
              </div>
              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Planned End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar size={18} />
                  </div>
                  <input
                    type="date"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Project Owner */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Project Owner / Manager</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all appearance-none cursor-pointer"
                  required
                  disabled={loadingEmployees}
                >
                  <option value="">-- Select Owner --</option>
                  {employees.map((emp) => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.displayName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {loadingEmployees && (
                <span className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading employees list...
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-gray-400">
                  <FileText size={18} />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide a general summary of the project..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all resize-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Objectives */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Objectives
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-gray-400">
                  <Target size={18} />
                </div>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  rows={3}
                  placeholder="e.g. Digitize operations, improve automation..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-secondary-dark focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all resize-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Actions / Footer */}
          <div className="flex gap-3 justify-end px-6 py-4.5 border-t border-gray-100 bg-slate-50 rounded-b-large">
            <button
              type="button"
              onClick={onClose}
              className="md-button-secondary text-sm py-2.5 px-5 cursor-pointer"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="md-button-primary text-sm py-2.5 px-5 cursor-pointer"
              disabled={submitting || loadingEmployees}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
