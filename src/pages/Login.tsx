import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ShieldCheck, ScanFace, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';

const features = [
  { icon: ScanFace, text: 'Real-time AI behavior detection' },
  { icon: ShieldCheck, text: 'Automated proctoring & alerts' },
  { icon: BarChart3, text: 'Detailed session reports & analytics' },
];

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setAuthError('');
    setSuccessMessage('');
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { full_name: data.full_name } },
        });
        if (error) throw error;
        setIsRegistering(false);
        setSuccessMessage('Account created! Please verify your email before signing in.');
        reset({ email: data.email, password: '' });
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        if (authData.session) {
          login(authData.session.access_token, authData.user);
          toast.success('Welcome back!');
          navigate('/');
        } else {
          setAuthError('Failed to establish a session. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setAuthError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full bg-white" />
          <div className="absolute bottom-[-100px] right-[-60px] w-[300px] h-[300px] rounded-full bg-white" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">GuardEye</span>
        </div>

        {/* Center content */}
        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Intelligent<br />exam proctoring<br />made simple.
          </h1>
          <p className="mt-4 text-blue-100 text-sm leading-relaxed max-w-xs">
            Monitor students in real time with AI-powered behavior analysis and instant alerts.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/20">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-blue-50">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-300">© {new Date().getFullYear()} GuardEye. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-800 font-bold text-lg tracking-tight">GuardEye</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isRegistering
                ? 'Set up your GuardEye proctoring account.'
                : 'Sign in to your proctoring dashboard.'}
            </p>
          </div>

          {/* Success banner */}
          {successMessage && !isRegistering && (
            <div className="mb-5 flex items-start gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              {successMessage}
            </div>
          )}

          {/* Error banner */}
          {authError && (
            <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
              {authError}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Full name (register only) */}
            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register('full_name', { required: isRegistering })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Jane Doe"
                  />
                </div>
                {errors.full_name && <span className="text-xs text-red-500">Full name is required</span>}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  {...register('email', { required: true })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="proctor@university.edu"
                />
              </div>
              {errors.email && <span className="text-xs text-red-500">Email is required</span>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: true })}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-red-500">Password is required</span>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner className="w-4 h-4" /> : null}
              {isLoading ? 'Please wait…' : isRegistering ? 'Create Account' : 'Sign in'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isRegistering ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
