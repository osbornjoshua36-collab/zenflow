import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

/**
 * Derives the 6-stage lifecycle from job + invoice data.
 * Each stage: { id, label, status: 'done' | 'active' | 'pending' | 'skipped', note }
 */
function deriveStages(job, invoice) {
  const s = job.status;
  const isCancelled = s === 'Cancelled' || s === 'No-Show';

  // Stage 1: Lead / Potential job created
  const hasLead = !!job.id;

  // Stage 2: Scheduled — has a scheduled_date and status isn't still just a proposal
  const isScheduled = !!job.scheduled_date && (
    job.scheduling_status === 'confirmed' ||
    s === 'Scheduled' || s === 'In Progress' || s === 'Completed'
  );

  // Stage 3: Job completed
  const isCompleted = s === 'Completed';

  // Stage 4: All tasks done (checklist)
  const checklist = job.checklist_items || [];
  const allTasksDone = checklist.length > 0 && checklist.every(i => i.is_complete);
  const noTasks = checklist.length === 0;

  // Stage 5: Invoiced
  const isInvoiced = !!invoice;

  // Stage 6: Paid
  const isPaid = invoice?.status === 'Paid';

  const stages = [
    {
      id: 'lead',
      label: 'Lead Received',
      status: hasLead ? 'done' : 'active',
      note: job.created_date
        ? new Date(job.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      status: isCancelled
        ? 'skipped'
        : isScheduled
        ? 'done'
        : hasLead
        ? 'active'
        : 'pending',
      note: isScheduled && job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : isCancelled
        ? s
        : null,
    },
    {
      id: 'completed',
      label: 'Job Done',
      status: isCancelled
        ? 'skipped'
        : isCompleted
        ? 'done'
        : s === 'In Progress'
        ? 'active'
        : 'pending',
      note: isCompleted && job.completed_at
        ? new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null,
    },
    {
      id: 'tasks',
      label: 'Tasks Complete',
      status: isCancelled
        ? 'skipped'
        : noTasks
        ? 'pending'
        : allTasksDone
        ? 'done'
        : isCompleted || s === 'In Progress'
        ? 'active'
        : 'pending',
      note: noTasks
        ? 'No tasks'
        : checklist.length > 0
        ? `${checklist.filter(i => i.is_complete).length}/${checklist.length}`
        : null,
    },
    {
      id: 'invoiced',
      label: 'Invoiced',
      status: isCancelled
        ? 'skipped'
        : isInvoiced
        ? 'done'
        : isCompleted
        ? 'active'
        : 'pending',
      note: invoice?.invoice_number ? `#${invoice.invoice_number}` : null,
    },
    {
      id: 'paid',
      label: 'Paid',
      status: isCancelled
        ? 'skipped'
        : isPaid
        ? 'done'
        : isInvoiced
        ? 'active'
        : 'pending',
      note: isPaid && invoice?.paid_date
        ? new Date(invoice.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : invoice?.status && !isPaid && isInvoiced
        ? invoice.status
        : null,
    },
  ];

  return stages;
}

export default function JobLifecycleTracker({ job, invoice }) {
  const stages = deriveStages(job, invoice);

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Job Lifecycle</h3>
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 z-0" />
        <div className="flex justify-between relative z-10">
          {stages.map((stage) => (
            <StageNode key={stage.id} stage={stage} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StageNode({ stage }) {
  const { status, label, note } = stage;

  const iconEl = (() => {
    if (status === 'done') return <CheckCircle className="w-8 h-8 text-green-500 bg-white rounded-full" />;
    if (status === 'active') return <Circle className="w-8 h-8 text-blue-500 bg-white rounded-full fill-blue-100" />;
    if (status === 'skipped') return <AlertCircle className="w-8 h-8 text-slate-300 bg-white rounded-full" />;
    return <Circle className="w-8 h-8 text-slate-300 bg-white rounded-full" />;
  })();

  const labelColor = status === 'done'
    ? 'text-green-700 font-semibold'
    : status === 'active'
    ? 'text-blue-700 font-semibold'
    : status === 'skipped'
    ? 'text-slate-300'
    : 'text-slate-400';

  return (
    <div className="flex flex-col items-center gap-1 w-16 text-center">
      {iconEl}
      <span className={`text-xs leading-tight mt-0.5 ${labelColor}`}>{label}</span>
      {note && (
        <span className="text-xs text-slate-400 leading-tight">{note}</span>
      )}
    </div>
  );
}