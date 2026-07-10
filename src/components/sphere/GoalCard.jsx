import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function GoalCard({ goal }) {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState(goal.subtasks || []);

  const pct = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
  const completedCount = subtasks.filter(s => s.is_complete).length;

  const toggleSubtask = async (subId) => {
    const updated = subtasks.map(s => s.id === subId ? { ...s, is_complete: !s.is_complete } : s);
    setSubtasks(updated);
    await base44.entities.Goal.update(goal.id, { subtasks: updated });
  };

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center gap-2">
        <span className="text-xl">{goal.emoji || '🎯'}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{goal.title}</p>
          <p className="text-xs text-muted-foreground">{completedCount}/{subtasks.length || goal.target_value} done · {pct}%</p>
        </div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
      </div>
      <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
        {expanded ? '‹ collapse' : '› subtasks & milestones'}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {subtasks.map(s => (
            <button key={s.id} onClick={() => toggleSubtask(s.id)} className="flex items-center gap-2 text-xs w-full text-left">
              <span className={s.is_complete ? 'text-sage' : 'text-muted-foreground'}>{s.is_complete ? '✓' : '○'}</span>
              <span className={s.is_complete ? 'line-through text-muted-foreground' : ''}>{s.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}