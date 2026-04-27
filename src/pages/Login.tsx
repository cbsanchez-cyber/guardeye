import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, Mail, Lock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import api from '../api';
import { supabase } from '../supabaseClient';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setAuthError('');
    setSuccessMessage('');
    try {
      if (isRegistering) {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        
        setIsRegistering(false);
        setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
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
      toast.error('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
     setIsLoading(true);
     try {
         // Assuming OAuth flow sets a token via some popup, here we just simulate it
         const res = await api.post('/auth/google', { token: 'mock-google-token' });
         if (res.data.token) {
             login(res.data.token, res.data.user);
             toast.success('Signed in with Google');
             navigate('/dashboard/schedule');
         }
     } catch (error) {
         toast.error('Google verification failed.');
     } finally {
        setIsLoading(false);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl leading-none shadow-sm pb-0.5">
              G
            </div>
        </div>
        <h2 className="mt-6 text-center text-[28px] font-bold text-slate-800 tracking-tight">
          GuardEye
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Sign in to your proctoring dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:rounded-[16px] sm:px-10 border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {successMessage && !isRegistering && (
              <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                {successMessage}
              </div>
            )}
            
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    {...register("full_name", { required: isRegistering })}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm text-slate-800 transition-colors bg-white"
                    placeholder="Jane Doe"
                  />
                </div>
                {errors.full_name && <span className="text-xs text-red-500 mt-1">Full name is required</span>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                <input
                  type="email"
                  {...register("email", { required: true })}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm text-slate-800 transition-colors bg-white"
                  placeholder="proctor@university.edu"
                />
              </div>
              {errors.email && <span className="text-xs text-red-500 mt-1">Email is required</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="password"
                  {...register("password", { required: true })}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 sm:text-sm text-slate-800 transition-colors bg-white"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <span className="text-xs text-red-500 mt-1">Password is required</span>}
            </div>

            {authError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {authError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors border-none disabled:opacity-70"
              >
                {isLoading ? <LoadingSpinner /> : isRegistering ? 'Create Account' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
                setSuccessMessage('');
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
