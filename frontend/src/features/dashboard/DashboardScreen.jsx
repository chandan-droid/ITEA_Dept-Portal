import React from 'react';
import { useAuth } from '../authentication/AuthProvider';
import { Card } from '../../shared/components/Card';
import { Activity } from 'lucide-react';

export const DashboardScreen = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 select-none animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-secondary-dark tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back to the Department Portal operations center.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 relative overflow-hidden" title="System Operator Profile">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Activity size={120} className="text-primary" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
              <span className="text-lg font-semibold text-secondary-dark mt-0.5 block">{user.name}</span>
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
      </div>
    </div>
  );
};
