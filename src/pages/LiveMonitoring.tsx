import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, Pause, Play, Square, Activity } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const LiveMonitoring = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [studentReports, setStudentReports] = useState<Record<string, any>>({});
  const [session, setSession] = useState<any>(null);
  const sessionRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // WebRTC references
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [webrtcStatus, setWebrtcStatus] = useState<string>('Connecting...');

  // Use refs to hold state inside interval without complex dependencies
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard/schedule');
      return;
    }

    // Initialize time tracking
    const storedElapsed = localStorage.getItem(`session_${sessionId}_elapsed`);
    const storedPaused = localStorage.getItem(`session_${sessionId}_paused`);
    const storedLastUpdate = localStorage.getItem(`session_${sessionId}_lastUpdate`);
    
    let initialElapsed = storedElapsed ? parseInt(storedElapsed, 10) : 0;
    const isPausedLocal = storedPaused === 'true';
    
    if (storedLastUpdate && !isPausedLocal) {
        const missed = Math.floor((Date.now() - parseInt(storedLastUpdate, 10)) / 1000);
        initialElapsed += missed;
    }
    
    setElapsedSeconds(initialElapsed);
    setIsPaused(isPausedLocal);
    isPausedRef.current = isPausedLocal;

    const timerInterval = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsedSeconds(() => {
          const storedElapsed = parseInt(localStorage.getItem(`session_${sessionId}_elapsed`) || '0', 10);
          const storedLast = parseInt(localStorage.getItem(`session_${sessionId}_lastUpdate`) || Date.now().toString(), 10);
          const now = Date.now();
          const diff = Math.floor((now - storedLast) / 1000);
          
          let next = storedElapsed;
          if (diff >= 1) {
             next = storedElapsed + diff;
             localStorage.setItem(`session_${sessionId}_elapsed`, next.toString());
             localStorage.setItem(`session_${sessionId}_lastUpdate`, now.toString());
          }

          // Auto-end session if time limit reached
          const currentSession = sessionRef.current;
          if (currentSession && currentSession.timeLimit && currentSession.timeLimit > 0 && next >= currentSession.timeLimit * 60) {
             supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId).then(() => {
                 localStorage.removeItem(`session_${sessionId}_elapsed`);
                 localStorage.removeItem(`session_${sessionId}_paused`);
                 localStorage.removeItem(`session_${sessionId}_lastUpdate`);
                 toast.success("Time limit reached. Session completed.");
                 navigate('/dashboard/records');
             });
          }

          return next;
        });
      }
    }, 1000);

    const fetchSession = async () => {
      try {
        const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
        if (data) {
           setSession(data);
           sessionRef.current = data;
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSession();

    const fetchAlerts = async () => {
      if (isPausedRef.current) return;
      try {
        const [{ data: alertData }, { data: reportData }] = await Promise.all([
          supabase.from('alerts').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false }),
          supabase.from('student_reports').select('*').eq('session_id', sessionId),
        ]);
        if (alertData) setAlerts(alertData);
        if (reportData) {
          setStudentReports(
            reportData.reduce((acc: Record<string, any>, r: any) => {
              acc[r.student_id] = r;
              return acc;
            }, {})
          );
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchAlerts().then(() => setLoading(false));

    const interval = setInterval(fetchAlerts, 5000);

    // Phase 1: send assign-session to RPi so it calls _run_session()
    const deviceId = 'pi-edge-001';
    const deviceCmdChannel = supabase.channel(`device_cmd_${deviceId}`);
    deviceCmdChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        deviceCmdChannel.send({
          type: 'broadcast',
          event: 'assign-session',
          payload: { sessionId },
        });
        console.log(`[Device] assign-session sent to device_cmd_${deviceId}`);
      }
    });

    // Phase 2: WebRTC — RPi waits for viewer-ready after assign-session
    const webrtcChannel = supabase.channel(`webrtc_${sessionId}`);
    
    const initWebRTC = async () => {
      console.log('WebRTC: initWebRTC called');
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Add a transciever to specify we want to receive video
      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        console.log('WebRTC: Received track', event.track.kind);
        if (videoRef.current) {
          if (event.streams && event.streams[0]) {
            console.log('WebRTC: Setting srcObject to event.streams[0]');
            videoRef.current.srcObject = event.streams[0];
          } else {
            console.log('WebRTC: Setting srcObject to new MediaStream');
            videoRef.current.srcObject = new MediaStream([event.track]);
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('WebRTC: Sending ICE candidate');
          webrtcChannel.send({
            type: 'broadcast',
            event: 'candidate',
            payload: { candidate: event.candidate },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('WebRTC: ICE Connection State:', pc.iceConnectionState);
        setWebrtcStatus('ICE: ' + pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log('WebRTC: Connection State:', pc.connectionState);
        setWebrtcStatus('Connection: ' + pc.connectionState);
      };

      return pc;
    };

    webrtcChannel
      .on('broadcast', { event: 'pi-ready' }, async () => {
        console.log('WebRTC: Received pi-ready');
        try {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
          }
          const pc = await initWebRTC();
          // Create offer since the web app is initiating the connection
          console.log('WebRTC: Creating offer');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log('WebRTC: Sending offer');
          webrtcChannel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { offer },
          });
        } catch (err) {
          console.error('WebRTC: Error creating offer on pi-ready:', err);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        console.log('WebRTC: Received answer');
        try {
          const pc = peerConnectionRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            console.log('WebRTC: Remote description set from answer');
          }
        } catch (error) {
          console.error('WebRTC: Error handling answer:', error);
        }
      })
      .on('broadcast', { event: 'candidate' }, async ({ payload }) => {
        console.log('WebRTC: Received ICE candidate');
        try {
          if (peerConnectionRef.current && payload.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch (error) {
          console.error('WebRTC: Error handling ICE candidate:', error);
        }
      })
      .subscribe(async (status) => {
        console.log('WebRTC: Channel status:', status);
        if (status === 'SUBSCRIBED') {
          // Tell the Pi we are on the page
          console.log('WebRTC: Sending viewer-ready');
          webrtcChannel.send({
            type: 'broadcast',
            event: 'viewer-ready',
            payload: {},
          });
          // Also create and send offer immediately in case Pi is already waiting
          try {
            const pc = await initWebRTC();
            console.log('WebRTC: Creating initial offer');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('WebRTC: Sending initial offer');
            webrtcChannel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { offer },
            });
          } catch (err) {
            console.error('WebRTC: Error creating initial offer:', err);
          }
        }
      });

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      supabase.removeChannel(deviceCmdChannel);
      supabase.removeChannel(webrtcChannel);
    };
  }, [sessionId, navigate]);

  const handleEndSession = async () => {
     if (!window.confirm("Are you sure you want to end this monitoring session?")) return;
     setEnding(true);
     try {
         const { error } = await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
         if (error) throw error;
         
         localStorage.removeItem(`session_${sessionId}_elapsed`);
         localStorage.removeItem(`session_${sessionId}_paused`);
         localStorage.removeItem(`session_${sessionId}_lastUpdate`);
         
         toast.success("Session completed");
         navigate('/dashboard/records');
     } catch (error) {
         console.error(error);
         toast.error("Failed to end session");
         setEnding(false);
     }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner className="w-8 h-8 text-blue-600" /></div>;

  const latestAlertsByStudent = alerts.reduce((acc, alert) => {
    if (!acc[alert.studentId] || new Date(alert.timestamp).getTime() > new Date(acc[alert.studentId].timestamp).getTime()) {
      acc[alert.studentId] = alert;
    }
    return acc;
  }, {} as Record<string, any>);

  // Merge student IDs from both alerts and student_reports (real data only — no dummies)
  const uniqueStudentIds = Array.from(new Set([
    ...alerts.map(a => a.studentId),
    ...Object.keys(studentReports),
  ]));

  const students = uniqueStudentIds.map(studentId => {
    const studentAlerts = alerts.filter(a => a.studentId === studentId);
    const latestAlert = latestAlertsByStudent[studentId];
    const report = studentReports[studentId];

    const avgRisk = studentAlerts.length > 0
      ? studentAlerts.reduce((sum, a) => sum + (a.riskScore || 0), 0) / studentAlerts.length
      : 0;
    const maxRisk = studentAlerts.length > 0
      ? Math.max(...studentAlerts.map(a => a.riskScore || 0))
      : 0;
    const finalLabel = maxRisk >= 0.75 ? 'HIGH RISK' : maxRisk >= 0.4 ? 'SUSPICIOUS' : 'NORMAL';

    return {
      studentId,
      studentName: latestAlert?.studentName || report?.student_id ? `Student ${report?.student_id}` : `Student ${studentId}`,
      headStatus: latestAlert?.headStatus || 'FORWARD',
      behaviorType: latestAlert?.behaviorType || null,
      riskScore: latestAlert?.riskScore || 0,
      avgRisk: report ? Number(report.avg_risk) : avgRisk,
      maxRisk: report ? Number(report.max_risk) : maxRisk,
      alertCount: report ? report.samples : studentAlerts.length,
      finalLabel: report?.final_label || finalLabel,
      timestamp: latestAlert?.timestamp || null,
      imageUrl: report?.image_url || latestAlert?.frameUrl || null,
    };
  });

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePause = () => {
     const nextPaused = !isPaused;
     setIsPaused(nextPaused);
     isPausedRef.current = nextPaused;
     localStorage.setItem(`session_${sessionId}_paused`, nextPaused.toString());
     localStorage.setItem(`session_${sessionId}_lastUpdate`, Date.now().toString());
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Active Session Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            Session ID: {sessionId} &bull; 
            {session?.timeLimit && (
              <>Time Limit: {session.timeLimit} mins &bull;</>
            )}
            Elapsed: <span className="font-mono text-slate-700 font-semibold">{formatTime(elapsedSeconds)}</span> &bull;
            <span className="bg-emerald-50 text-emerald-600 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100 flex items-center gap-1.5">
               <span className={`relative flex h-1.5 w-1.5`}>
                  {!isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
               </span>
               LIVE
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <button
             onClick={togglePause}
             className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
           >
             {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4 text-slate-600" />}
             {isPaused ? 'Resume' : 'Pause'}
           </button>
           <button
             onClick={handleEndSession}
             disabled={ending}
             className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-600 active:scale-[0.98] transition-all"
           >
             {ending ? <LoadingSpinner className="w-4 h-4" /> : <Square className="w-4 h-4" />}
             End Session
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-4">
        {/* Left: Camera Feed */}
        <div className="col-span-1 lg:col-span-2 flex flex-col bg-slate-900 rounded-[16px] overflow-hidden relative shadow-sm border-slate-800 shrink-0 min-h-[400px] lg:min-h-0 lg:h-[calc(100vh-14rem)]">
           <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
              <span className="relative flex h-2 w-2">
                 {!isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>}
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-slate-500' : 'bg-red-500'}`}></span>
              </span>
              Raspberry Pi 5 Hub (Cam 01)
           </div>
           
           {isPaused ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                 <Pause className="w-12 h-12 mb-3 opacity-50" />
                 <p className="font-medium text-lg">Stream Paused</p>
                 <p className="text-sm text-slate-500 mt-1">Live feed will resume when unpaused</p>
              </div>
           ) : (
              <div className="w-full h-full relative select-none bg-slate-800 overflow-hidden flex items-center justify-center group">
                 <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover"
                 />
                 <div className="absolute top-4 right-4 z-10 bg-black/60 text-white text-xs px-2 py-1.5 rounded border border-white/10 font-mono">
                    {webrtcStatus}
                 </div>
                 {/* Scanning line animation */}
                 <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-b from-transparent to-emerald-500/40 blur-[1px] animate-scan" style={{ top: 0 }} />
              </div>
           )}
        </div>

        {/* Right: Detected Students */}
        <div className="col-span-1 lg:col-span-1 flex flex-col bg-white rounded-[16px] border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden lg:h-[calc(100vh-14rem)] min-h-[400px]">
           <div className="p-4 px-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-base font-semibold text-slate-800">Detected Students</h2>
              <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md font-medium border border-slate-100">{students.length} Active</span>
           </div>
           
           <div className="overflow-y-auto flex-1 p-4">
             {students.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                   <Activity className="w-5 h-5 text-slate-400" />
                 </div>
                 <p className="text-sm font-medium text-slate-500">Waiting for edge device</p>
                 <p className="text-xs text-slate-400 mt-1">Students will appear once the RPi starts detecting</p>
               </div>
             ) : (
             <div className="flex flex-col gap-3">
               {students.map(student => {
                 const labelColor =
                   student.finalLabel === 'HIGH RISK' ? 'bg-red-50 text-red-700 border-red-200' :
                   student.finalLabel === 'SUSPICIOUS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                   'bg-emerald-50 text-emerald-700 border-emerald-200';

                 const headStatusColor =
                   student.headStatus === 'FORWARD' ? 'text-emerald-600' : 'text-amber-600';

                 return (
                   <div key={student.studentId} className="p-3 border border-slate-100 rounded-[12px] bg-white shadow-sm flex flex-col gap-2.5 transition-colors">
                     {/* Top row: avatar + name + label */}
                     <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2.5 min-w-0">
                         {student.imageUrl ? (
                           <img
                             src={student.imageUrl}
                             alt={student.studentName}
                             className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                           />
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm shrink-0">
                             {student.studentId}
                           </div>
                         )}
                         <div className="min-w-0">
                           <p className="text-sm font-semibold text-slate-800 truncate">{student.studentName}</p>
                           <p className={`text-xs font-medium ${headStatusColor}`}>Head: {student.headStatus}</p>
                         </div>
                       </div>
                       <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md border ${labelColor}`}>
                         {student.finalLabel}
                       </span>
                     </div>

                     {/* Stats row */}
                     <div className="grid grid-cols-3 gap-1.5 text-center">
                       <div className="bg-slate-50 rounded-lg py-1.5 border border-slate-100">
                         <p className="text-xs text-slate-400 leading-none mb-0.5">Alerts</p>
                         <p className="text-sm font-bold text-slate-700">{student.alertCount}</p>
                       </div>
                       <div className="bg-slate-50 rounded-lg py-1.5 border border-slate-100">
                         <p className="text-xs text-slate-400 leading-none mb-0.5">Avg Risk</p>
                         <p className="text-sm font-bold text-slate-700">{(student.avgRisk * 100).toFixed(0)}%</p>
                       </div>
                       <div className={`rounded-lg py-1.5 border ${student.maxRisk >= 0.75 ? 'bg-red-50 border-red-100' : student.maxRisk >= 0.4 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                         <p className="text-xs text-slate-400 leading-none mb-0.5">Max Risk</p>
                         <p className={`text-sm font-bold ${student.maxRisk >= 0.75 ? 'text-red-700' : student.maxRisk >= 0.4 ? 'text-amber-700' : 'text-slate-700'}`}>
                           {(student.maxRisk * 100).toFixed(0)}%
                         </p>
                       </div>
                     </div>

                     {/* Latest behavior */}
                     {student.behaviorType && (
                       <p className="text-xs text-slate-400 truncate">
                         Latest: <span className="text-slate-600 font-medium">{student.behaviorType.replace(/_/g, ' ')}</span>
                       </p>
                     )}
                   </div>
                 );
               })}
             </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};