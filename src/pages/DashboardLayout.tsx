import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CalendarPlus, Play, Activity, History } from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Schedule Session', href: '/dashboard/schedule', icon: CalendarPlus },
  { name: 'Start Session', href: '/dashboard/start', icon: Play },
  { name: 'Live Monitoring', href: '/dashboard/monitoring', icon: Activity },
  { name: 'Session Records', href: '/dashboard/records', icon: History },
];

export const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="flex w-60 flex-col gap-2 border-r border-slate-200 bg-white p-4 pt-6 shrink-0 h-full overflow-y-auto hidden md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all',
                  isActive
                    ? 'bg-blue-600/10 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-[18px] h-[18px] shrink-0',
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    )}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto h-full">
          <div className="mx-auto max-w-6xl h-full">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
