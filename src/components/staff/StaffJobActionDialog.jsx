import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import { X, AlertTriangle, RefreshCw, UserX, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ACTIONS = [
  {
    id: 'reschedule',
    label: 'Reschedule',
    icon: RefreshCw,
    description: 'Propose a new date/time for this job',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'reassign',
    label: 'Reassign to someone else',
    icon: UserX,
    description: 'Remove yourself and let a manager assign another staff member',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    id: 'cancel',
    label: 'Cancel this job',
    icon: XCircle,
    description: 'Cancel the job entirely — requires owner permission',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200 hover:bg-red-100',
  },
];

export default function StaffJobActionDialog({ assignment, job, resource, onClose, onSaved }) {
  const [step, setStep] = useState('choose'); // choose | reschedule | reassign | cancel | confirm
  const [action, setAction] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [allResources, setAllResources] = useState([]);
  const [reassignTo, setReassignTo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (action === 'reassign') {
      base44.asServiceRole.entities.Resource.filter({ resource_type: 'staff' }).then(res =>
        setAllResources(res.filter(r => r.id !== resource.id && r.is_active !== false))
      );
    }
  }, [action, resource.id]);

  const handleConfirm = async () => {
    setSaving(true);

    if (action === 'reschedule') {
      const newStart = new Date(`${newDate}T${newTime}`);
      const durationMs = new Date(assignment.end_datetime) - new Date(assignment.start_datetime);
      const newEnd = new Date(newStart.getTime() + durationMs);

      // Update assignment times
      await base44.asServiceRole.entities.ResourceAssignment.update(assignment.id, {
        start_datetime: newStart.toISOString(),
        end_datetime: newEnd.toISOString(),
      });

      // Update the job's scheduled_date too
      await base44.asServiceRole.entities.Job.update(job.id, {
        scheduled_date: newStart.toISOString(),
        job_activity: [
          ...(job.job_activity || []),
          {
            timestamp: new Date().toISOString(),
            event_type: 'rescheduled',
            description: `Job rescheduled by ${resource.name}${reason ? `: ${reason}` : ''}`,
            actor: resource.name,
          },
        ],
      });

    } else if (action === 'reassign') {
      // Remove this staff member's assignment
      await base44.asServiceRole.entities.ResourceAssignment.update(assignment.id, { status: 'cancelled' });

      // If a replacement was selected, create a new assignment
      if (reassignTo) {
        await base44.asServiceRole.entities.ResourceAssignment.create({
          job_id: assignment.job_id,
          resource_id: reassignTo,
          slot_label: assignment.slot_label || 'Technician',
          start_datetime: assignment.start_datetime,
          end_datetime: assignment.end_datetime,
          status: 'confirmed',
          notes: `Reassigned from ${resource.name}${reason ? `: ${reason}` : ''}`,
          assigned_at: new Date().toISOString(),
        });
      }

      await base44.asServiceRole.entities.Job.update(job.id, {
        job_activity: [
          ...(job.job_activity || []),
          {
            timestamp: new Date().toISOString(),
            event_type: 'reassigned',
            description: `Assignment removed for ${resource.name}${reassignTo ? `, reassigned to ${allResources.find(r => r.id === reassignTo)?.name}` : ' — pending reassignment'}${reason ? `: ${reason}` : ''}`,
            actor: resource.name,
          },
        ],
      });

    } else if (action === 'cancel') {
      await base44.asServiceRole.entities.Job.update(job.id, {
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Cancelled by staff',
        cancelled_by: 'seller',
        job_activity: [
          ...(job.job_activity || []),
          {
            timestamp: new Date().toISOString(),
            event_type: 'cancelled',
            description: `Job cancelled by ${resource.name}${reason ? `: ${reason}` : ''}`,
            actor: resource.name,
          },
        ],
      });

      // Cancel the assignment
      await base44.asServiceRole.entities.ResourceAssignment.update(assignment.id, { status: 'cancelled' });
    }

    onSaved();
  };

  const canConfirm = () => {
    if (action === 'reschedule') return newDate && newTime;
    if (action === 'cancel') return reason.length >= 3;
    return true; // reassign (optional replacement)
  };

  const selectedAction = ACTIONS.find(a => a.id === action);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Manage Assignment</h2>
            <p className="text-sm text-slate-500">{job?.title} · {format(new Date(assignment.start_datetime), 'EEE, MMM d h:mm a')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'choose' && (
            <>
              <p className="text-sm text-slate-600">What would you like to do with this assignment?</p>
              <div className="space-y-2">
                {ACTIONS.map(act => {
                  const Icon = act.icon;
                  const isCancel = act.id === 'cancel';
                  const locked = isCancel && !resource?.can_cancel_jobs;
                  return locked ? (
                    <div
                      key={act.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-400">{act.label}</p>
                        <p className="text-xs text-slate-400">Only the business owner can cancel jobs</p>
                      </div>
                      <span className="text-xs bg-slate-200 text-slate-500 rounded px-2 py-0.5 font-medium">Owner only</span>
                    </div>
                  ) : (
                    <button
                      key={act.id}
                      onClick={() => { setAction(act.id); setStep(act.id); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${act.bg}`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${act.color}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${act.color}`}>{act.label}</p>
                        <p className="text-xs text-slate-500">{act.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 'reschedule' && (
            <>
              <p className="text-sm text-slate-600">Choose a new date and time for this job.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">New Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    min={format(addDays(new Date(), 0), 'yyyy-MM-dd')}
                    onChange={e => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">New Start Time</label>
                  <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Reason (optional)</label>
                  <Input placeholder="e.g. Sick day, personal appointment" value={reason} onChange={e => setReason(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 'reassign' && (
            <>
              <p className="text-sm text-slate-600">
                You'll be removed from this job. Optionally select a replacement — otherwise a manager will assign someone.
              </p>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Reassign to (optional)</label>
                <select
                  value={reassignTo}
                  onChange={e => setReassignTo(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">— Leave unassigned for manager —</option>
                  {allResources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.role ? ` (${r.role})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Reason (optional)</label>
                <Input placeholder="e.g. Sick day, schedule conflict" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
            </>
          )}

          {step === 'cancel' && (
            <>
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  This will cancel the entire job and notify the customer. This cannot be undone.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Reason <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Please provide a reason for cancellation"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <Button
            variant="outline"
            onClick={step === 'choose' ? onClose : () => setStep('choose')}
            className="flex-1"
          >
            {step === 'choose' ? 'Close' : 'Back'}
          </Button>
          {step !== 'choose' && (
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm() || saving}
              className={`flex-1 text-white ${
                action === 'cancel'
                  ? 'bg-red-600 hover:bg-red-700'
                  : action === 'reassign'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving…' : selectedAction?.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}