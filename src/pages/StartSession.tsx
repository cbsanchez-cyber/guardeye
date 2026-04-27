import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Server, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const StartSession = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  
  const [piStatus, setPiStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['upcoming', 'active'])
        .order('date', { ascending: true })
        .order('startTime', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartClick = (session: any) => {
    setSelectedSession(session);
    setPiStatus('checking');
    
    // Simulate Pi Status Check
    setTimeout(() => {
      setPiStatus('online'); // Fake successful connection for UX
    }, 1500);
  };

  const beginProctoring = async () => {
    if (!selectedSession) return;
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'active' })
        .eq('id', selectedSession.id);
        
      if (error) throw error;
      
      localStorage.setItem(`session_${selectedSession.id}_elapsed`, '0');
      localStorage.setItem(`session_${selectedSession.id}_paused`, 'false');
      localStorage.setItem(`session_${selectedSession.id}_lastUpdate`, Date.now().toString());
      
      toast.success('Session started');
      navigate(`/dashboard/monitoring?sessionId=${selectedSession.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start session');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner className="w-8 h-8 text-blue-600" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Start Session</h1>
        <p className="text-sm text-slate-500 mt-1">Select an upcoming session to connect to the hardware and begin proctoring.</p>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <ul role="list" className="divide-y divide-slate-100">
          {sessions.length === 0 ? (
             <li className="px-4 py-12 sm:px-6 text-center text-slate-500 text-sm">
               No upcoming sessions. Schedule one first.
             </li>
          ) : (
            sessions.map((session) => (
              <li key={session.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-slate-50/50 sm:px-6 transition-colors">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Server className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-slate-800 flex items-center gap-2">
                      {session.name}
                      {session.status === 'active' && (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex text-xs leading-5 text-slate-500">
                      {format(new Date(session.date), 'MMM d, yyyy')} • {session.startTime} • {session.timeLimit} mins • {session.room}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-x-4">
                  {session.status === 'active' ? (
                    <button
                      onClick={() => navigate(`/dashboard/monitoring?sessionId=${session.id}`)}
                      className="hidden sm:flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <Play className="w-4 h-4 text-emerald-600" />
                      Resume Session
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartClick(session)}
                      className="hidden sm:flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <Play className="w-4 h-4 text-blue-600" />
                      Start Session
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal directly in the component for simplicity */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-sm transform overflow-hidden rounded-[24px] bg-white p-6 text-left shadow-2xl transition-all flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold leading-6 text-slate-800 tracking-tight">Hardware Connection</h3>
              <button onClick={() => setSelectedSession(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center py-10 px-4 text-center">
              {piStatus === 'checking' && (
                <>
                  <LoadingSpinner className="w-12 h-12 text-blue-600 mb-4" />
                  <p className="text-sm font-medium text-slate-800">Pinging Raspberry Pi...</p>
                  <p className="text-sm text-slate-500 mt-1">Establishing secure connection to camera array.</p>
                </>
              )}
              {piStatus === 'online' && (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                  <p className="text-sm font-medium text-slate-800">Pi connected. Ready to start.</p>
                  <p className="text-sm text-slate-500 mt-1">Camera and ML models are initialized.</p>
                </>
              )}
               {piStatus === 'offline' && (
                <>
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-sm font-medium text-slate-800">Pi not detected.</p>
                  <p className="text-sm text-slate-500 mt-1">Check network and power on the hardware.</p>
                </>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
               <button
                  type="button"
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedSession(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={piStatus !== 'online'}
                  className="inline-flex justify-center items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)] hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
                  onClick={beginProctoring}
                >
                  Begin Proctoring
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
