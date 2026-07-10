import { useState } from 'react';

export default function GoalWidget({ goals }) {
  const [expanded, setExpanded] = useState(false);
  const goal = goals[0];

  if (!goal) {
    return (
      <div className="rounded-xl p-4 bg-card border border-border">
        <p className="text-xs font-medium text-muted-foreground">📚 goals</p>
        <p className="text-sm text-muted-foreground mt-3">No active goals yet. Add one to start tracking progress.</p>
      </div>
    );
  }

  const pct = goal.target_value ? Math.round((goal.current_value / goal.target_value) * 100) : 0;

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center gap-2">
        <span className="text-lg">{goal.emoji || '🎯'}</span>
        <p className="text-sm font-medium flex-1">{goal.title}</p>
        <span className="text-xs font-bold text-terracotta-dark">{pct}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{goal.current_value} of {goal.target_value} {goal.unit || ''} complete</p>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
      </div>
      {expanded && (goal.subtasks || []).length > 0 && (
        <div className="mt-3 space-y-1">
          {goal.subtasks.slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className={s.is_complete ? 'text-sage' : 'text-muted-foreground'}>{s.is_complete ? '✓' : '○'}</span>
              <span className={s.is_complete ? 'line-through text-muted-foreground' : ''}>{s.text}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
        {expanded ? '‹ collapse' : '› subtasks & milestones'}
      </button>
    </div>
  );
}