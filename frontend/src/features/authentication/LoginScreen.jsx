import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ShieldAlert, Lock, User, Terminal, Cpu, KeyRound, ChevronRight } from 'lucide-react';

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
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row select-none">
      
      {/* LEFT SIDE: Brand Hero Area (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 brand-gradient text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden shrink-0">
        
        {/* Subtle grid pattern background overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-light/40 rounded-full blur-3xl animate-pulse-slow"></div>

        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-extrabold text-xl text-white tracking-wider shadow-sm">
            MSIL
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.25em] text-accent">MARUTI SUZUKI</span>
            <span className="text-xs font-semibold tracking-wide text-white/80">India Limited</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="z-10 my-auto py-8">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            ITEA Portal
          </h1>
          <p className="text-sm lg:text-base text-white/70 mt-4 max-w-md font-medium leading-relaxed">
            Information Technology Enterprise Application hub. Providing secure, unified gateway credentials mapping directly to active corporate structures.
          </p>
        </div>

        {/* Brand Footer */}
        <div className="z-10 text-xs text-white/40 font-medium">
          © {new Date().getFullYear()} Maruti Suzuki India Limited. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Header (visible on mobile) */}
          <div className="text-center md:text-left">
            <div className="md:hidden inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-base shadow-md">
                I
              </div>
              <span className="font-bold text-secondary-dark text-lg tracking-tight">ITEA Portal</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-secondary-dark lg:text-3xl">
              Account Login
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Enter your enterprise credentials to access the console.
            </p>
          </div>

          <div className="bg-white border border-gray-200/60 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                  <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs font-medium text-red-800 leading-relaxed whitespace-pre-line">
                    {error}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-xs font-bold text-secondary-dark uppercase tracking-wider mb-2">
                  Username / ID
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="md-input"
                    placeholder="Enter uid (e.g., rakesh, dev)"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-secondary-dark uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="md-input"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !username.trim() || !password.trim()}
                  className="md-button-primary w-full"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
          
          <p className="text-[10px] text-gray-400 text-center md:text-left font-medium">
            Protected by MSIL Group directory configuration policies. Unauthorized access is strictly logged.
          </p>
        </div>
      </div>
    </div>
  );
};
