import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function PriorityReviewDialog({ tasks, onClose, onSaved }) {
  const [oneThingId, setOneThingId] = useState(tasks.find(t => t.priority_level === 'one_thing')?.id || '');
  const [top3Ids, setTop3Ids] = useState(tasks.filter(t => t.priority_level === 'top3').map(t => t.id));
  const [saving, setSaving] = useState(false);
  const eligible = tasks.filter(t => !t.completed);

  const toggleTop3 = (id) => {
    setTop3Ids(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      for (const t of tasks) {
        let level = 'normal';
        if (t.id === oneThingId) level = 'one_thing';
        else if (top3Ids.includes(t.id)) level = 'top3';
        if (t.priority_level !== level) {
          updates.push(base44.entities.PersonalTask.update(t.id, { priority_level: level }));
        }
      }
      await Promise.all(updates);
      onSaved();
      onClose();
    } catch (e) {
      console.error('Failed to save priorities:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>📋 Set Today's Priorities</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Pick your #1 thing and top 3 tasks for today.</p>

        <p className="text-xs font-medium mb-2">🎯 Your #1 thing</p>
        <div className="space-y-1 mb-4">
          {eligible.map(t => (
            <button key={t.id} onClick={() => setOneThingId(oneThingId === t.id ? '' : t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${oneThingId === t.id ? 'bg-terracotta text-white' : 'bg-secondary hover:bg-secondary/80'}`}>
              {t.title}
            </button>
          ))}
        </div>

        <p className="text-xs font-medium mb-2">📋 Top 3 for today</p>
        <div className="space-y-1 mb-4">
          {eligible.map(t => (
            <button key={t.id} onClick={() => toggleTop3(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${top3Ids.includes(t.id) ? 'bg-sage text-white' : 'bg-secondary hover:bg-secondary/80'}`}>
              {t.title}
            </button>
          ))}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-2 rounded-lg bg-terracotta text-white text-sm font-medium hover:bg-terracotta-dark disabled:opacity-50">
          {saving ? 'Saving...' : 'done'}
        </button>
      </div>
    </div>
  );
}