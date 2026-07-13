import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/authentication/AuthProvider';
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: '/profile',
      label: 'My Profile',
      icon: User,
      show: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top App Bar */}
      <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-30 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-large text-gray-500 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-large bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              I
            </div>
            <span className="font-bold text-lg text-secondary-dark tracking-tight">
              Department Portal
            </span>
          </div>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-secondary-dark">{user.name}</span>
              <span className="text-xs text-gray-400 font-medium">{user.role.replace('ROLE_', '')}</span>
            </div>
            
            <div className="w-9 h-9 rounded-full bg-primary-light text-primary-dark font-bold flex items-center justify-center shadow-sm select-none border border-primary/20">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-large transition-all duration-200 flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden md:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content & Sidebar */}
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full py-4 select-none shrink-0">
          <nav className="flex-1 space-y-1 px-3">
            {navItems
              .filter(item => item.show)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-large text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </nav>
        </aside>

        {/* Drawer for Mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-20 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="relative flex flex-col w-64 max-w-xs bg-white h-full pt-20 pb-4 shadow-xl select-none animate-fade-in">
              <nav className="flex-1 space-y-1 px-3">
                {navItems
                  .filter(item => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-large text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
