import { Clock } from 'lucide-react';

const EVENT_ICONS = {
  job_created: '📋',
  times_proposed: '📅',
  time_confirmed: '✅',
  job_rescheduled: '🔄',
  job_started: '▶️',
  reminder_sent: '🔔',
  photos_added: '📷',
  checklist_completed: '☑️',
  job_completed: '🏁',
  invoice_created: '🧾',
  invoice_sent: '📧',
  invoice_paid: '💰',
  review_received: '⭐',
  job_cancelled: '❌',
  no_show_recorded: '⚠️',
  job_reactivated: '🔁',
};

const ACTOR_LABELS = {
  seller: { label: 'Business', color: 'text-blue-600' },
  buyer: { label: 'Customer', color: 'text-purple-600' },
  system: { label: 'System', color: 'text-slate-400' },
};

export default function JobActivityLog({ job }) {
  const activities = [...(job.job_activity || [])].reverse();

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Activity</h3>
      {activities.length === 0 ? (
        <p className="text-xs text-slate-400">No activity recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {activities.map((entry, i) => {
            const actor = ACTOR_LABELS[entry.actor] || ACTOR_LABELS.system;
            return (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 w-6 text-center text-base leading-5 mt-0.5">
                  {EVENT_ICONS[entry.event_type] || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{entry.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    <span className={`ml-1 ${actor.color}`}>· {actor.label}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}