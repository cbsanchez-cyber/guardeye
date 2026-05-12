import React, { useState, useEffect } from 'react';
import { ChevronRight, FileSpreadsheet, CheckCircle2, Image as ImageIcon, Trash2, Users, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const SessionRecords = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionReports, setSessionReports] = useState<any[]>([]);
  const [sessionEventLogs, setSessionEventLogs] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const loadSessionDetail = async (sessionId: string) => {
    if (selectedSession === sessionId) {
      setSelectedSession(null);
      return;
    }
    setSelectedSession(sessionId);
    setDetailLoading(true);
    setSessionReports([]);
    setSessionEventLogs([]);
    try {
      const [{ data: reportData }, { data: logData }] = await Promise.all([
        supabase.from('student_reports').select('*').eq('session_id', sessionId).order('student_id'),
        supabase.from('event_logs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(100),
      ]);
      if (reportData) setSessionReports(reportData);
      if (logData) setSessionEventLogs(logData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load session details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadCSV = async (sessionId: string, sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const [{ data: alerts }, { data: reports }, { data: logs }] = await Promise.all([
        supabase.from('alerts').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true }),
        supabase.from('student_reports').select('*').eq('session_id', sessionId),
        supabase.from('event_logs').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      ]);

      const lines: string[] = [];

      lines.push('=== STUDENT SUMMARY ===');
      lines.push('Student ID,Avg Risk,Max Risk,Samples,Final Label');
      (reports || []).forEach(r => {
        lines.push(`${r.student_id},${r.avg_risk},${r.max_risk},${r.samples},${r.final_label || ''}`);
      });
      lines.push('');

      lines.push('=== EVENT LOG ===');
      lines.push('Timestamp,Student,Event Type,Head Status,Risk Score,Details');
      (logs || []).forEach(l => {
        lines.push(`${l.event_ts_iso || l.created_at},${l.student_id || ''},${l.event_type || ''},${l.head_status || ''},${l.risk_score ?? 0},"${(l.details || '').replace(/"/g, '""')}"`);
      });
      lines.push('');

      lines.push('=== ALERTS ===');
      lines.push('Timestamp,Student ID,Event Type,Head Status,Risk Score,Details');
      (alerts || []).forEach(a => {
        lines.push(`${new Date(a.timestamp).toISOString()},${a.studentId || ''},${a.behaviorType || ''},${a.headStatus || ''},${a.riskScore ?? 0},"${(a.details || '').replace(/"/g, '""')}"`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionName.replace(/[^a-z0-9]/gi, '_')}_report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download report');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session record?')) return;
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
      setSessions(sessions.filter((s: any) => s.id !== sessionId));
      if (selectedSession === sessionId) setSelectedSession(null);
      toast.success('Session deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete session');
    }
  };

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
          ) : sessions.map((session) => (
            <li
              key={session.id}
              className={`relative px-4 py-5 sm:px-6 transition-colors cursor-pointer ${selectedSession === session.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
              onClick={() => loadSessionDetail(session.id)}
            >
              {/* Session row header */}
              <div className="flex justify-between items-center gap-x-6">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-slate-800">{session.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {format(new Date(session.date), 'MMM d, yyyy')} &bull; {session.startTime} &bull; {session.timeLimit} mins &bull; {session.room}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadCSV(session.id, session.name, e)}
                    title="Download Full Report CSV"
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    title="Delete Record"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedSession === session.id ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {selectedSession === session.id && (
                <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col gap-8" onClick={e => e.stopPropagation()}>
                  {detailLoading ? (
                    <div className="flex justify-center py-8"><LoadingSpinner className="w-6 h-6 text-blue-600" /></div>
                  ) : (
                    <>
                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Students</p>
                            <p className="text-xl font-bold text-slate-800">{sessionReports.length}</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Events Logged</p>
                            <p className="text-xl font-bold text-slate-800">{sessionEventLogs.length}</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">High Risk</p>
                            <p className="text-xl font-bold text-slate-800">
                              {sessionReports.filter(r => r.final_label === 'HIGH RISK').length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Student Captures from student_reports */}
                      {sessionReports.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <h4 className="text-sm font-semibold text-slate-800">Student Captures</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {sessionReports.map(report => {
                              const label = report.final_label || 'NORMAL';
                              const labelColor = label === 'HIGH RISK'
                                ? 'text-red-600 bg-red-50 border-red-200'
                                : label === 'SUSPICIOUS'
                                ? 'text-amber-600 bg-amber-50 border-amber-200'
                                : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                              const ringColor = label === 'HIGH RISK' ? 'border-red-400'
                                : label === 'SUSPICIOUS' ? 'border-amber-400' : 'border-slate-200';
                              return (
                                <div key={report.id} className="flex flex-col items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                  {report.image_url ? (
                                    <img
                                      src={report.image_url}
                                      alt={`Student ${report.student_id}`}
                                      className={`w-16 h-16 rounded-full object-cover border-2 ${ringColor}`}
                                    />
                                  ) : (
                                    <div className={`w-16 h-16 rounded-full bg-slate-50 border-2 ${ringColor} flex items-center justify-center font-bold text-slate-600 text-lg`}>
                                      {report.student_id}
                                    </div>
                                  )}
                                  <div className="flex flex-col items-center w-full gap-1">
                                    <span className="text-xs font-semibold text-slate-700">Student {report.student_id}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${labelColor}`}>{label}</span>
                                    <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                      <span>Avg {(Number(report.avg_risk) * 100).toFixed(0)}%</span>
                                      <span>&middot;</span>
                                      <span>{report.samples} samples</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Event Log from event_logs */}
                      {sessionEventLogs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 mb-4">Event Log</h4>
                          <div className="border border-slate-200 rounded-[12px] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto max-h-64 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                  <tr className="text-slate-500 text-left">
                                    <th className="px-4 py-2.5 font-medium">Time</th>
                                    <th className="px-4 py-2.5 font-medium">Student</th>
                                    <th className="px-4 py-2.5 font-medium">Event</th>
                                    <th className="px-4 py-2.5 font-medium">Head Status</th>
                                    <th className="px-4 py-2.5 font-medium">Risk</th>
                                    <th className="px-4 py-2.5 font-medium">Details</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                  {sessionEventLogs.map(log => {
                                    const risk = parseFloat(log.risk_score) || 0;
                                    const riskColor = risk >= 0.75 ? 'text-red-600 font-semibold' : risk >= 0.4 ? 'text-amber-600 font-semibold' : 'text-slate-500';
                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-mono text-slate-400 whitespace-nowrap">
                                          {log.event_ts_iso ? new Date(log.event_ts_iso).toLocaleTimeString() : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-slate-700 font-medium">Student {log.student_id}</td>
                                        <td className="px-4 py-2">
                                          <span className={`px-2 py-0.5 rounded-md border font-medium ${
                                            log.event_type?.includes('high_risk') ? 'bg-red-50 text-red-700 border-red-200' :
                                            log.event_type?.includes('contraband') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            log.event_type?.includes('warning') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-slate-50 text-slate-600 border-slate-200'
                                          }`}>
                                            {log.event_type?.replace(/_/g, ' ') || '—'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">{log.head_status || '—'}</td>
                                        <td className={`px-4 py-2 font-mono ${riskColor}`}>{(risk * 100).toFixed(0)}%</td>
                                        <td className="px-4 py-2 text-slate-400 truncate max-w-[180px]">{log.details || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
