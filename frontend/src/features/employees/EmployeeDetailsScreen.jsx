import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeApi } from '../../core/api/employeeApi';
import { Card } from '../../shared/components/Card';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../authentication/AuthProvider';
import { ArrowLeft, Shield, Users, Mail, Clock, AlertCircle, ToggleLeft, CheckCircle2 } from 'lucide-react';

export const EmployeeDetailsScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await employeeApi.getById(id);
        setEmployee(data);
      } catch (err) {
        console.error('Failed to get employee details', err);
        setError(err.message || 'Failed to retrieve details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleActivate = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await employeeApi.activate(employee.userId);
      setEmployee(prev => ({ ...prev, status: 'ACTIVE' }));
      setActionSuccess('User account activated successfully.');
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to activate user account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await employeeApi.deactivate(employee.userId);
      setEmployee(prev => ({ ...prev, status: 'INACTIVE' }));
      setActionSuccess('User account deactivated successfully.');
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to deactivate user account.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-10 select-none animate-fade-in">
        <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-large text-center">
          <p className="font-semibold text-sm">{error || 'Employee details not found'}</p>
        </div>
        <button onClick={() => navigate('/employees')} className="md-button-secondary w-full">
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>
    );
  }

  const canActivate = hasPermission('USER_ACTIVATE');
  const canDeactivate = hasPermission('USER_DEACTIVATE');
  const isTargetAdmin = employee.roles && employee.roles.includes('ROLE_ADMIN');
  const showAdminActions = (canActivate || canDeactivate) && !isTargetAdmin;

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 hover:bg-gray-100 rounded-large text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Employee Details</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deep security authorization profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center text-center p-6 h-fit" title="Directory Profile">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary font-extrabold text-2xl flex items-center justify-center border border-primary/20 shadow-sm mt-3">
            {employee.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <h2 className="mt-4 text-lg font-bold text-secondary-dark">{employee.displayName}</h2>
          <span className="text-xs text-gray-400 mt-0.5 block">{employee.email}</span>
          <div className="mt-3">
            <StatusBadge status={employee.status} />
          </div>

          <div className="w-full mt-6 border-t border-gray-100 pt-6 text-left space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">User PK ID</span>
              <span className="text-sm font-semibold text-secondary-dark block mt-0.5 font-mono">{employee.userId}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Employee ID</span>
              <span className="text-sm font-semibold text-secondary-dark block mt-0.5">{employee.employeeId}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
              <span className="text-sm font-semibold text-secondary-dark block mt-0.5">{employee.email}</span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Administrative actions console */}
          {showAdminActions && (
            <Card title="Administrative Actions">
              <div className="space-y-4">
                <p className="text-xs text-gray-500 font-medium">
                  Modify the authentication status of this employee record. Changes persist instantly in LDAP sync.
                </p>
                {actionError && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-large text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-large text-xs text-green-800 flex items-start gap-2">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-green-500" />
                    <span>{actionSuccess}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  {employee.status === 'ACTIVE' && canDeactivate && (
                    <button
                      onClick={handleDeactivate}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-large text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:pointer-events-none hover:shadow"
                    >
                      <ToggleLeft size={14} />
                      <span>Deactivate Profile</span>
                    </button>
                  )}
                  {employee.status !== 'ACTIVE' && canActivate && (
                    <button
                      onClick={handleActivate}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-large text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:pointer-events-none hover:shadow"
                    >
                      <CheckCircle2 size={14} />
                      <span>Activate Profile</span>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card title="Security Mapped Roles">
            <div className="space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5 mb-2 font-medium">
                <Shield size={14} /> Active Mapped Roles
              </span>
              <div className="flex flex-wrap gap-2">
                {employee.roles && employee.roles.length > 0 ? (
                  employee.roles.map((r) => (
                    <span key={r} className="text-xs font-semibold px-2.5 py-1.5 rounded-large bg-primary/5 border border-primary/20 text-primary">
                      {r}
                    </span>
                  ))
                ) : employee.roles === null ? (
                  <div className="flex gap-2 items-start text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-large text-xs">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>Role details are omitted from the payload for privacy constraints (Requires ROLE_ADMIN clearance).</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No mapped roles</span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Granted Security Permissions">
            <div className="space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5 mb-2 font-medium">
                <Users size={14} /> System Authorities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {employee.permissions && employee.permissions.length > 0 ? (
                  employee.permissions.map((p) => (
                    <span key={p} className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No permissions mapped</span>
                )}
              </div>
            </div>
          </Card>

          <Card title="System Chronology">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2.5 p-3.5 border border-gray-100 rounded-large bg-gray-50/50">
                <Clock size={16} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-400 font-bold block">First Sync Date</span>
                  <span className="font-semibold text-secondary-dark mt-0.5 block">
                    {employee.createdAt ? new Date(employee.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 border border-gray-100 rounded-large bg-gray-50/50">
                <Clock size={16} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-400 font-bold block">Last Successful Session</span>
                  <span className="font-semibold text-secondary-dark mt-0.5 block">
                    {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : 'Never logged in'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
