import { useEffect, useRef } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CalendarPlus, Play, Activity, History, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

const navigation = [
  { name: 'Schedule Session', href: '/dashboard/schedule', icon: CalendarPlus },
  { name: 'Start Session',    href: '/dashboard/start',    icon: Play },
  { name: 'Live Monitoring',  href: '/dashboard/monitoring', icon: Activity },
  { name: 'Session Records',  href: '/dashboard/records',  icon: History },
];

export const DashboardLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'GE';

  useEffect(() => {
    if (!user) return;

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

            if (session.timeLimit && session.timeLimit > 0 && currentElapsed >= session.timeLimit * 60) {
              await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id);
              localStorage.removeItem(`session_${session.id}_elapsed`);
              localStorage.removeItem(`session_${session.id}_paused`);
              localStorage.removeItem(`session_${session.id}_lastUpdate`);
              return;
            }

            if (isPaused) return;

            if (Math.random() > 0.6) {
              const students = ['Student_1', 'Student_2', 'Student_3', 'Student_4', 'Student_5'];
              const behaviors = ['head_pose_warning', 'phone_detected', 'multiple_persons', 'absent'];
              const headStatuses = ['Looking Down!', 'Looking Left!', 'Looking Right!', 'Looking Up!'];
              const studentId = students[Math.floor(Math.random() * students.length)];
              const behaviorType = behaviors[Math.floor(Math.random() * behaviors.length)];
              const headStatus = behaviorType === 'head_pose_warning'
                ? headStatuses[Math.floor(Math.random() * headStatuses.length)]
                : null;
              const riskScore = Math.random() * 0.5 + 0.5;

              await supabase.from('alerts').insert([{
                user_id: user.id,
                session_id: session.id,
                studentId: studentId.replace('Student_', ''),
                studentName: studentId.replace('_', ' '),
                behaviorType,
                riskScore,
                headStatus,
                alertThreshold: 0.75,
                frameIndex: Math.floor(Math.random() * 100),
                details: headStatus || behaviorType,
                frameUrl: 'https://cdn.coverr.co/videos/coverr-students-listening-in-a-university-lecture-3059/1080p.mp4',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      {/* Mobile header */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col shrink-0 h-full bg-white border-r border-slate-200">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">GuardEye</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Menu
            </p>
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'w-[17px] h-[17px] shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
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

          {/* Sidebar footer — user + logout */}
          <div className="shrink-0 border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate leading-tight">
                  {user?.name || user?.email || 'Proctor'}
                </p>
                {user?.name && (
                  <p className="text-xs text-slate-400 truncate leading-tight">{user.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto h-full">
          <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
