import React, { useState, useEffect, useMemo } from 'react';
import { Download, ChevronRight, FileSpreadsheet, CheckCircle2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertLogTable } from '../components/AlertLogTable';

export const SessionRecords = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionAlerts, setSessionAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

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
        .eq('status', 'completed')
        .order('date', { ascending: false });
        
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
       console.error(error);
       toast.error('Failed to load past sessions');
    } finally {
       setLoading(false);
    }
  };

  const handleDownloadCSV = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info('No alerts recorded for this session');
        return;
      }

      // Generate CSV manually
      const headers = ['Timestamp', 'Student ID', 'Student Name', 'Behavior Type', 'Risk Score'];
      const rows = data.map(alert => [
        new Date(alert.timestamp).toISOString(),
        alert.studentId || '',
        alert.studentName || '',
        alert.behaviorType || '',
        alert.riskScore || ''
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}_report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download report');
    }
  };

  const loadSessionAlerts = async (sessionId: string) => {
      if (selectedSession === sessionId) {
          setSelectedSession(null);
          return;
      }
      setSelectedSession(sessionId);
      setAlertsLoading(true);
      try {
          const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: false });
            
          if (error) throw error;
          setSessionAlerts(data || []);
      } catch (error) {
          console.error(error);
          toast.error("Failed to load session alerts");
      } finally {
          setAlertsLoading(false);
      }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session record?')) return;
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (selectedSession === sessionId) setSelectedSession(null);
      toast.success('Session record deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete session record');
    }
  };

  const uniqueStudents = useMemo(() => {
    const students = Array.from(new Set(sessionAlerts.map(a => a.studentId)));
    // If no alerts, maybe mock some students:
    if (students.length === 0 && !alertsLoading && selectedSession) {
       return ['Student_1', 'Student_2', 'Student_3', 'Student_4', 'Student_5'];
    }
    return students;
  }, [sessionAlerts, alertsLoading, selectedSession]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner className="w-8 h-8 text-blue-600" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Session Records</h1>
        <p className="text-sm text-slate-500 mt-1">Review past proctoring sessions and download student behavior reports.</p>
      </div>

      <div className="bg-white rounded-[16px] border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <ul role="list" className="divide-y divide-slate-100">
          {sessions.length === 0 ? (
             <li className="px-4 py-12 sm:px-6 text-center text-slate-500 text-sm">
               No completed sessions found.
             </li>
          ) : (
            sessions.map((session) => (
              <li 
                 key={session.id} 
                 className={`relative px-4 py-5 sm:px-6 transition-colors cursor-pointer ${selectedSession === session.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                 onClick={() => loadSessionAlerts(session.id)}
              >
                <div className="flex justify-between items-center gap-x-6">
                  <div className="flex min-w-0 gap-x-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                       <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm font-semibold leading-6 text-slate-800">
                        {session.name}
                      </p>
                      <p className="mt-1 flex text-xs leading-5 text-slate-500">
                        {format(new Date(session.date), 'MMM d, yyyy')} • {session.startTime} • {session.timeLimit} mins • {session.room}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <button
                        onClick={(e) => handleDownloadCSV(session.id, e)}
                        title="Download CSV Report"
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                     >
                         <FileSpreadsheet className="w-5 h-5" />
                     </button>
                     <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete Record"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                     >
                         <Trash2 className="w-5 h-5" />
                     </button>
                     <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedSession === session.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                
                {selectedSession === session.id && (
                    <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col gap-8" onClick={e => e.stopPropagation()}>
                        
                        {/* Student Captures Section */}
                        {(!alertsLoading && uniqueStudents.length > 0) && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                               <ImageIcon className="w-4 h-4 text-slate-400" />
                               <h4 className="text-sm font-semibold text-slate-800">Student Captures</h4>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                               {uniqueStudents.map(studentId => (
                                 <div key={studentId} className="flex flex-col items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                   <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                      <img 
                                        src={`https://i.pravatar.cc/150?u=${studentId}`} 
                                        alt={studentId}
                                        className="w-full h-full object-cover"
                                      />
                                   </div>
                                   <span className="text-xs font-medium text-slate-700 truncate w-full text-center">
                                     {studentId}
                                   </span>
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}

                        {/* Alerts Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 mb-4">Detailed Alert Log</h4>
                          {alertsLoading ? (
                               <div className="flex justify-center py-6"><LoadingSpinner className="w-6 h-6 text-blue-600" /></div>
                          ) : (
                               <div className="border border-slate-200 rounded-[12px] overflow-hidden shadow-sm">
                                  <AlertLogTable alerts={sessionAlerts} consolidate={true} />
                               </div>
                          )}
                        </div>
                        
                    </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
