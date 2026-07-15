import React from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { Card } from '../../shared/components/Card';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { User, Mail, Shield, Fingerprint, Key, Clock, Compass } from 'lucide-react';

export const ProfileScreen = () => {
  const { user, roles, permissions } = useAuth();

  if (!user) return null;

  const displayName = user.displayName || user.name || 'System Operator';
  const init = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Detailed corporate identity metrics synced from Active Directory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="flex flex-col items-center text-center p-6 h-fit" title="Identity Token">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-extrabold text-3xl flex items-center justify-center border border-primary/20 shadow-sm mt-3">
            {init}
          </div>
          <h2 className="mt-4 text-lg font-bold text-secondary-dark">{displayName}</h2>
          <span className="text-xs text-gray-400 mt-0.5 block">{user.email}</span>
          <div className="mt-3">
            <StatusBadge status={user.status || 'ACTIVE'} />
          </div>

          <div className="w-full mt-6 border-t border-gray-100 pt-6 text-left space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Employee ID</span>
              <span className="text-sm font-semibold text-secondary-dark block mt-0.5">{user.employeeId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">AD Login Account</span>
              <span className="text-sm font-semibold text-secondary-dark block mt-0.5 font-mono">{user.samAccountName || 'N/A'}</span>
            </div>
          </div>
        </Card>

        {/* Details & Permissions Cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Directory Attributes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mt-2">
              <div className="flex items-start gap-3">
                <User className="text-gray-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                  <span className="text-sm font-semibold text-secondary-dark mt-0.5 block">{displayName}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="text-gray-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-secondary-dark mt-0.5 block">{user.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Fingerprint className="text-gray-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">User Principal Name (UPN)</span>
                  <span className="text-sm font-semibold text-secondary-dark mt-0.5 block font-mono text-xs">{user.userPrincipalName || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="text-gray-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Primary Role Context</span>
                  <span className="text-sm font-semibold text-secondary-dark mt-0.5 block">{user.role || 'ROLE_USER'}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Granted Group Roles">
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5 mb-2 font-medium">
                <Shield size={14} className="text-gray-400" /> Authorized Roles
              </span>
              <div className="flex flex-wrap gap-2">
                {roles && roles.length > 0 ? (
                  roles.map((r) => (
                    <span key={r.roleId || r.roleName} className="text-xs font-semibold px-2.5 py-1 rounded bg-primary/5 border border-primary/20 text-primary">
                      {r.roleName || r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary/5 border border-primary/20 text-primary">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Granted Security Authority (By Module)">
            <div className="space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5 mb-2 font-medium">
                <Key size={14} className="text-gray-400" /> Active System Permissions
              </span>
              {permissions && Object.keys(permissions).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(permissions).map(([module, perms]) => (
                    <div key={module} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-secondary-dark block mb-1.5 flex items-center gap-1">
                        <Compass size={12} className="text-primary-light" /> {module}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((p) => (
                          <span key={p} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400">No specific module permissions mapped.</span>
              )}
            </div>
          </Card>

          <Card title="Login Audit Metrics">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2.5 p-3.5 border border-gray-100 rounded-large bg-gray-50/50">
                <Clock size={16} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-400 font-bold block">First Sync Date</span>
                  <span className="font-semibold text-secondary-dark mt-0.5 block">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 border border-gray-100 rounded-large bg-gray-50/50">
                <Clock size={16} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-400 font-bold block">Last Authentication Session</span>
                  <span className="font-semibold text-secondary-dark mt-0.5 block">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}
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
