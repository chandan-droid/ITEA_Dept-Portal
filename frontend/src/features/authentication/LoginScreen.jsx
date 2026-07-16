import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Shield, Lock, User, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export const LoginScreen = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-gray-800">

      {/* LEFT SIDE: Brand Hero Area */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-center p-12 lg:p-20 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f3d7a 0%, #051633 100%)',
          backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
          backgroundColor: '#0a2351'
        }}
      >
        <div className="absolute inset-0 bg-blue-900/60 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#020b1e]/90 z-0"></div>

        <div className="z-10 flex flex-col space-y-8 mt-12 max-w-lg">
          <div className="w-16 h-16 rounded-full border border-blue-400/50 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
            <Shield className="text-blue-300 w-8 h-8" strokeWidth={1.5} />
            <div className="absolute w-4 h-4 mt-1 bg-blue-500 rounded-sm flex items-center justify-center opacity-0"></div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-wide">
              Digital Enterprise CGOV<br />Department Portal
            </h1>
            <div className="w-12 h-1 bg-blue-400 rounded-full mt-2 mb-6"></div>
            <p className="text-blue-100 text-lg">
              Secure Access. Connected Teams. Smarter Enterprise.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        <div className="w-full max-w-[420px] animate-fade-in flex flex-col justify-center min-h-[500px]">

          {/* Logo Header */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col text-[#0a2351] tracking-wider ml-1">
                <span className="font-extrabold text-xl leading-none">MARUTI</span>
                <span className="font-extrabold text-xl leading-none">SUZUKI</span>
              </div>
            </div>
          </div>

          <div className="w-10 h-[3px] bg-blue-600 mb-8 rounded-full"></div>

          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-[#0a2351] mb-2">
              Welcome Back, DE-CGV4 Team
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Sign in to continue your account
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="text-sm font-medium text-red-800">
                  {error}
                </div>
              </div>
            )}

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={18} strokeWidth={2} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all"
                  placeholder="Employee ID"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} strokeWidth={2} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !username.trim() || !password.trim()}
                className="w-full bg-[#003899] hover:bg-[#002d7a] text-white font-semibold py-3.5 rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 md:bottom-10 left-0 right-0 text-center px-6">
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            © 2026 Maruti Suzuki India Limited<br />
            Digital Enterprise CGOV Portal<br />
            Version 1.0
          </p>
        </div>
      </div>
    </div>
  );
};
