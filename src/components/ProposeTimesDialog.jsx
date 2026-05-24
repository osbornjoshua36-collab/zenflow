import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function ProposeTimesDialog({ job, onClose, onSaved }) {
  const [dates, setDates] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);

  const setDate = (i, v) => {
    const next = [...dates];
    next[i] = v;
    setDates(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const proposed = dates.filter(Boolean).map(d => new Date(d).toISOString());
    await base44.entities.Job.update(job.id, {
      proposed_dates: proposed,
      scheduling_status: 'proposed',
    });
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: 'Times proposed for "' + job.title + '" — awaiting buyer confirmation.',
      type: 'job_update',
      related_entity_id: job.id,
    });
    onSaved();
    onClose();
  };

  const slots = ['Option 1 (required)', 'Option 2 (optional)', 'Option 3 (optional)'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Propose times</h3>
            <p className="text-sm text-slate-500 mt-0.5">"{job.title}"</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600">Offer up to 3 available time slots for the buyer to choose from.</p>

        {slots.map((label, i) => (
          <div key={i}>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={dates[i]}
              onChange={e => setDate(i, e.target.value)}
            />
          </div>
        ))}

        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1 bg-navy text-white hover:bg-navy-light"
            onClick={handleSubmit}
            disabled={!dates[0] || loading}
          >
            {loading ? 'Saving…' : 'Send to buyer'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}