import React from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { Card } from '../../shared/components/Card';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { User, Mail, Shield } from 'lucide-react';

export const ProfileScreen = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Detailed read-only identity metrics retrieved from authentication context.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center text-center p-8">
          <div className="w-20 h-20 rounded-full bg-primary-light text-primary-dark font-extrabold text-3xl flex items-center justify-center border border-primary/20 shadow-md select-none">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <h2 className="mt-4 text-xl font-bold text-secondary-dark">{user.name}</h2>
          <p className="text-xs text-gray-400 mt-1">{user.email}</p>
          <div className="mt-3">
            <StatusBadge status="ACTIVE" />
          </div>
        </Card>

        <Card className="lg:col-span-2" title="Directory Attributes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mt-2">
            <div className="flex items-start gap-3">
              <User className="text-gray-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                <span className="text-sm font-semibold text-secondary-dark mt-0.5 block">{user.name}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-gray-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-secondary-dark mt-0.5 block">{user.email}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:col-span-2 border-t border-gray-100 pt-6">
              <Shield className="text-gray-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Assigned Security Role</span>
                <div className="mt-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary/5 border border-primary/20 text-primary">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
