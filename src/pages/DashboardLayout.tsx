import React, { useEffect, useRef } from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CalendarPlus, Play, Activity, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

const navigation = [
  { name: 'Schedule Session', href: '/dashboard/schedule', icon: CalendarPlus },
  { name: 'Start Session', href: '/dashboard/start', icon: Play },
  { name: 'Live Monitoring', href: '/dashboard/monitoring', icon: Activity },
  { name: 'Session Records', href: '/dashboard/records', icon: History },
];

export const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Background alert simulator for active sessions
    const runSimulation = async () => {
      try {
        const { data: activeSessions } = await supabase
          .from('sessions')
          .select('id, timeLimit')
          .eq('status', 'active')
          .eq('user_id', user.id);

        if (activeSessions && activeSessions.length > 0) {
          activeSessions.forEach(async (session) => {
            const isPaused = localStorage.getItem(`session_${session.id}_paused`) === 'true';
            
            // Background time tracking
            const storedElapsed = parseInt(localStorage.getItem(`session_${session.id}_elapsed`) || '0', 10);
            const storedLast = parseInt(localStorage.getItem(`session_${session.id}_lastUpdate`) || Date.now().toString(), 10);
            const now = Date.now();
            let currentElapsed = storedElapsed;
            
            if (!isPaused) {
                const diff = Math.floor((now - storedLast) / 1000);
                if (diff > 0) {
                    currentElapsed += diff;
                    localStorage.setItem(`session_${session.id}_elapsed`, currentElapsed.toString());
                    localStorage.setItem(`session_${session.id}_lastUpdate`, now.toString());
                }
            }
            
            // Auto-complete if time limit reached
            if (session.timeLimit && session.timeLimit > 0 && currentElapsed >= session.timeLimit * 60) {
                 await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id);
                 localStorage.removeItem(`session_${session.id}_elapsed`);
                 localStorage.removeItem(`session_${session.id}_paused`);
                 localStorage.removeItem(`session_${session.id}_lastUpdate`);
                 return; // Do not generate alerts for completed session
            }

            if (isPaused) return;

            // Generate a random alert 40% of the time
            if (Math.random() > 0.6) {
              const students = ['Student_1', 'Student_2', 'Student_3', 'Student_4', 'Student_5'];
              const behaviors = ['head_pose_warning', 'phone_detected', 'multiple_persons', 'absent'];
              const headStatuses = ['Looking Down!', 'Looking Left!', 'Looking Right!', 'Looking Up!'];
              const studentId = students[Math.floor(Math.random() * students.length)];
              const behaviorType = behaviors[Math.floor(Math.random() * behaviors.length)];
              const headStatus = behaviorType === 'head_pose_warning' ? headStatuses[Math.floor(Math.random() * headStatuses.length)] : null;
              const riskScore = Math.random() * 0.5 + 0.5;

              await supabase.from('alerts').insert([{
                user_id: user.id,
                session_id: session.id,
                studentId: studentId.replace('Student_', ''), // to match format '1' instead of 'Student_1'
                studentName: studentId.replace('_', ' '),
                behaviorType: behaviorType,
                riskScore: riskScore,
                headStatus: headStatus,
                alertThreshold: 0.75,
                frameIndex: Math.floor(Math.random() * 100),
                details: headStatus || behaviorType,
                frameUrl: 'https://cdn.coverr.co/videos/coverr-students-listening-in-a-university-lecture-3059/1080p.mp4'
              }]);
            }
          });
        }
      } catch (err) {
        console.error('Simulation error:', err);
      }
    };

    if (!simIntervalRef.current) {
      simIntervalRef.current = setInterval(runSimulation, 6000);
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [user]);

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
