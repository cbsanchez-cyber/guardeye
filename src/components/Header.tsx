import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 shrink-0">
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl leading-none">
              G
           </div>
           <span className="text-[22px] font-bold text-blue-600 tracking-tight">
             GuardEye
           </span>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-slate-800">{user?.name || 'Dr. Sarah Jenkins'}</span>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
              {user?.name ? user.name.substring(0, 2) : 'SJ'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:block text-sm font-medium text-slate-500 border border-slate-200 px-3.5 py-1.5 rounded-lg hover:bg-slate-50 hover:text-red-500 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};
