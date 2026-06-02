import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, RotateCcw, ExternalLink } from 'lucide-react';
import ProposeTimesDialog from '@/components/ProposeTimesDialog';

const RESCHEDULE_REASONS = [
  'Seller unavailable',
  'Equipment issue',
  'Customer requested change',
  'Weather conditions',
  'Other',
];

const fmtDate = (d) =>
  new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function JobSchedulingQueue({ jobs, onRefresh }) {
  const navigate = useNavigate();
  const [proposeJob, setProposeJob] = useState(null);
  const [rescheduleJobId, setRescheduleJobId] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [loading, setLoading] = useState(false);

  const queueJobs = jobs.filter(j =>
    ['awaiting_proposal', 'proposed', 'confirmed'].includes(j.scheduling_status)
  );

  if (queueJobs.length === 0) return null;

  const handleReschedule = async (job) => {
    if (!rescheduleReason) return;
    setLoading(true);
    await base44.entities.Job.update(job.id, {
      scheduling_status: 'awaiting_proposal',
      proposed_dates: [],
      confirmed_date: null,
      notes: (job.notes || '') + '\nReschedule reason: ' + rescheduleReason,
    });
    setRescheduleJobId(null);
    setRescheduleReason('');
    setLoading(false);
    onRefresh();
  };

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Scheduling Queue</h3>
      {queueJobs.map(job => (
        <div key={job.id} className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <button
                className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1 text-left"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                {job.title}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
              {job.actual_cost ? <p className="text-xs text-slate-500 mt-0.5">${job.actual_cost}</p> : null}
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {job.scheduling_status === 'awaiting_proposal' && (
                <Button
                  size="sm"
                  className="bg-navy text-white hover:bg-navy-light gap-1.5"
                  onClick={() => setProposeJob(job)}
                >
                  <Calendar className="w-3 h-3" /> Propose times
                </Button>
              )}

              {job.scheduling_status === 'proposed' && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                  Proposed — awaiting buyer
                </span>
              )}

              {job.scheduling_status === 'confirmed' && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    Confirmed · {job.confirmed_date ? fmtDate(job.confirmed_date) : ''}
                  </span>
                  {rescheduleJobId !== job.id && (
                    <button
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5 underline underline-offset-2"
                      onClick={() => { setRescheduleJobId(job.id); setRescheduleReason(''); }}
                    >
                      <RotateCcw className="w-3 h-3" /> Reschedule
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Show proposed dates back to seller */}
          {job.scheduling_status === 'proposed' && job.proposed_dates?.length > 0 && (
            <div className="text-xs text-slate-500 space-y-1 pl-1">
              <p className="font-medium text-slate-600">Proposed times:</p>
              {job.proposed_dates.map((d, i) => (
                <p key={i}>• {fmtDate(d)}</p>
              ))}
            </div>
          )}

          {/* Reschedule form */}
          {rescheduleJobId === job.id && (
            <div className="border-t pt-3 space-y-3">
              <p className="text-sm font-medium text-slate-700">Reason for rescheduling</p>
              <Select value={rescheduleReason} onValueChange={setRescheduleReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {RESCHEDULE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  disabled={!rescheduleReason || loading}
                  onClick={() => handleReschedule(job)}
                >
                  Confirm reschedule
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRescheduleJobId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {proposeJob && (
        <ProposeTimesDialog
          job={proposeJob}
          onClose={() => setProposeJob(null)}
          onSaved={() => { setProposeJob(null); onRefresh(); }}
        />
      )}
    </div>
  );
}