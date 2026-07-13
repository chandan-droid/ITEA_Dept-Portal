import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShieldAlert, Lock, User } from 'lucide-react';

export const LoginScreen = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold text-2xl shadow-md border border-primary/20">
          I
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-dark tracking-tight">
          Department Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Enterprise Sign-In
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-200/60 shadow-lg rounded-large sm:px-10 animate-fade-in">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-large flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm font-medium text-red-800 leading-relaxed whitespace-pre-line">
                  {error}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-secondary-dark mb-2">
                Employee ID / Username
              </label>
              <div className="relative rounded-large shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="md-input pl-10"
                  placeholder="e.g. dev, manager"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-secondary-dark mb-2">
                Password
              </label>
              <div className="relative rounded-large shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="md-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !username.trim() || !password.trim()}
                className="md-button-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Demo Accounts</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 border border-gray-200/60 p-2.5 rounded-large text-center">
                <span className="font-semibold text-secondary-dark block">Admin</span>
                <code className="text-primary font-mono block mt-1">dev</code>
              </div>
              <div className="bg-gray-50 border border-gray-200/60 p-2.5 rounded-large text-center">
                <span className="font-semibold text-secondary-dark block">Manager</span>
                <code className="text-primary font-mono block mt-1">manager</code>
              </div>
              <div className="bg-gray-50 border border-gray-200/60 p-2.5 rounded-large text-center">
                <span className="font-semibold text-secondary-dark block">User</span>
                <code className="text-primary font-mono block mt-1">user</code>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center font-medium">
              Password for all accounts is <code className="font-mono bg-gray-100 px-1 rounded text-red-500 font-semibold">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
