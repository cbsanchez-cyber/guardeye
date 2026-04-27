import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Check, ShieldAlert } from 'lucide-react';

interface Alert {
  id: string;
  timestamp: string;
  behaviorType: string;
  riskScore: number;
  studentId: string;
  acknowledged: boolean;
}

interface ConsolidatedAlert extends Alert {
  count: number;
  ids: string[];
}

interface AlertLogTableProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string, alertIds: string[]) => void;
  consolidate?: boolean;
}

export const AlertLogTable: React.FC<AlertLogTableProps> = ({ alerts, onAcknowledge, consolidate = false }) => {
  const displayAlerts = useMemo(() => {
    if (!consolidate) return alerts.map(a => ({ ...a, count: 1, ids: [a.id] }));

    // Grouping by studentId and behaviorType within 10 seconds
    const consolidated: ConsolidatedAlert[] = [];
    
    // Assumes alerts are sorted newest first. If not, sort them.
    const sortedAlerts = [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    sortedAlerts.forEach(alert => {
      if (consolidated.length === 0) {
        consolidated.push({ ...alert, count: 1, ids: [alert.id] });
        return;
      }

      const lastGroup = consolidated[consolidated.length - 1];
      const timeDiff = Math.abs(new Date(lastGroup.timestamp).getTime() - new Date(alert.timestamp).getTime());

      // If same student, same type, within 10s (10000ms), and same acknowledgment status, bundle them
      if (
        lastGroup.studentId === alert.studentId && 
        lastGroup.behaviorType === alert.behaviorType &&
        timeDiff <= 10000 &&
        lastGroup.acknowledged === alert.acknowledged
      ) {
        lastGroup.count += 1;
        lastGroup.ids.push(alert.id);
        // keep the highest risk score
        lastGroup.riskScore = Math.max(lastGroup.riskScore, alert.riskScore);
      } else {
        consolidated.push({ ...alert, count: 1, ids: [alert.id] });
      }
    });

    return consolidated;
  }, [alerts, consolidate]);

  const getRiskColor = (score: number) => {
    if (score >= 0.75) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 0.25) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  if (displayAlerts.length === 0) {
    return (
      <div className="text-center py-12 flex flex-col items-center">
        <ShieldAlert className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-sm font-medium text-slate-800">No alerts detected</h3>
        <p className="text-sm text-slate-500 mt-1">All monitoring systems appear normal.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-white border-b border-slate-100">
          <tr>
            <th scope="col" className="py-4 pl-5 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Behavior</th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Score</th>
            <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="relative py-4 pl-3 pr-5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {displayAlerts.map((alert) => (
            <tr key={alert.id} className={cn('transition-colors hover:bg-slate-50', alert.acknowledged ? 'opacity-75' : '')}>
              <td className="whitespace-nowrap py-4 pl-5 pr-3 text-sm text-slate-500">
                {format(new Date(alert.timestamp), 'HH:mm:ss')}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-slate-800">
                {alert.studentId}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-[13px] text-slate-500 flex items-center gap-1.5">
                {alert.behaviorType}
                {alert.count > 1 && (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-800">
                    x{alert.count}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4">
                <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-bold border', getRiskColor(alert.riskScore))}>
                  {(alert.riskScore * 100).toFixed(0)}%
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                {alert.acknowledged ? (
                  <span className="inline-flex items-center text-emerald-500 font-medium gap-1 text-xs">
                    <Check className="w-3.5 h-3.5" /> Reviewed
                  </span>
                ) : (
                  <span className="text-amber-500 font-medium text-xs">Pending</span>
                )}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-5 text-right text-sm">
                {!alert.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id, alert.ids)}
                    className="inline-flex items-center bg-transparent border border-slate-200 text-slate-500 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-600 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
