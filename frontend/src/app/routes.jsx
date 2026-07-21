import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/authentication/AuthProvider';
import { Layout } from '../shared/components/Layout';
import { LoginScreen } from '../features/authentication/LoginScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { LoadingSpinner } from '../shared/components/LoadingSpinner';

import { EmployeesScreen } from '../features/employees/EmployeesScreen';
import { EmployeeDetailsScreen } from '../features/employees/EmployeeDetailsScreen';
import { AttendanceScreen } from '../features/attendance/AttendanceScreen';
import { ProjectsScreen } from '../features/projects/ProjectsScreen';
import { ProjectDetailsScreen } from '../features/projects/ProjectDetailsScreen';
import { TasksScreen } from '../features/tasks/TasksScreen';
import { TaskDetailsScreen } from '../features/tasks/TaskDetailsScreen';
import AnnouncementsScreen from '../features/announcements/AnnouncementsScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
        <Route path="attendance" element={<AttendanceScreen />} />
        <Route path="employees" element={<EmployeesScreen />} />
        <Route path="employees/:id" element={<EmployeeDetailsScreen />} />
        <Route path="tasks" element={<TasksScreen />} />
        <Route path="tasks/:taskId" element={<TaskDetailsScreen />} />
        <Route path="projects" element={<ProjectsScreen />} />
        <Route path="projects/:projectId" element={<ProjectDetailsScreen />} />
        <Route path="announcements" element={<AnnouncementsScreen />} />
        <Route path="notifications" element={<NotificationsScreen />} />
        <Route path="calendar" element={<ComingSoon page="Calendar" />} />
        <Route path="reports" element={<ComingSoon page="Reports" />} />
        <Route path="admin" element={<ComingSoon page="Administration" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function ComingSoon({ page }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-[64px] text-gray-300 mb-4">construction</span>
      <h2 className="text-xl font-bold text-gray-700">{page}</h2>
      <p className="text-sm text-gray-400 mt-2">This module is coming soon.</p>
    </div>
  );
}
