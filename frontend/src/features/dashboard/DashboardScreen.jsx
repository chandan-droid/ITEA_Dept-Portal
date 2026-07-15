import React from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../shared/components/Card';
import { Activity, Users, ShieldAlert, Key, ChevronRight } from 'lucide-react';

export const DashboardScreen = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = user.displayName || user.name || 'System Operator';

  const canViewTeam = hasPermission('EMPLOYEE_VIEW_TEAM');
  const canViewDetails = hasPermission('EMPLOYEE_VIEW_DETAILS');
  const canManageStatus = hasPermission('USER_ACTIVATE') || hasPermission('USER_DEACTIVATE');

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back to the MSIL ITEA Portal operations center.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operator Profile Card */}
        <Card className="lg:col-span-3 relative overflow-hidden" title="System Operator Profile">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Activity size={120} className="text-primary" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
              <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">{displayName}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
              <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">{user.email}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Active Portal Role</span>
              <div className="mt-1.5">
                <span className="text-sm font-semibold inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Mapped Operations Catalog (Dynamically rendered based on active permissions list) */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-semibold">
            Authorized System Modules
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {canViewTeam && (
              <div className="bg-white border border-gray-200/60 p-5 rounded-large shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-large bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-secondary-dark">Team Directory</h4>
                    <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">
                      Browse, search, and page through synchronized employee profiles and credentials.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/employees')}
                  className="mt-6 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary-dark transition-colors"
                >
                  <span>Launch Module</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}

            {canViewDetails && (
              <div className="bg-white border border-gray-200/60 p-5 rounded-large shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-large bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <Key size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-secondary-dark">Security Authorization Profiles</h4>
                    <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">
                      Access deep employee files to inspect system authorities, mapped permissions, and login audit chains.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono">
                    Clearance: View details
                  </span>
                </div>
              </div>
            )}

            {canManageStatus && (
              <div className="bg-white border border-gray-200/60 p-5 rounded-large shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-large bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-secondary-dark">User Access Administration</h4>
                    <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">
                      Toggle portal account status tags (Activate / Deactivate) for department employee accounts.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600 font-mono">
                    Clearance: Status controller
                  </span>
                </div>
              </div>
            )}

            {!canViewTeam && !canViewDetails && !canManageStatus && (
              <div className="col-span-3 text-center py-10 bg-white border border-gray-200/60 rounded-large shadow-sm">
                <p className="text-sm text-gray-400 font-semibold">
                  No operational modules are currently mapped to your permission list.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
