import { Play, Pencil } from 'lucide-react';

export default function FocusBanner({ task, onUnset }) {
  if (!task) {
    return (
      <div className="rounded-xl p-5 bg-card border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">🎯 today's one thing</p>
        <p className="text-sm text-muted-foreground mt-2">Tap "📋 priorities" to set your #1 thing for today</p>
        <p className="text-xs text-muted-foreground mt-1">your single most important task — everything else is secondary</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5 bg-terracotta text-white">
      <p className="text-xs uppercase tracking-wide opacity-80">🎯 today's one thing</p>
      <p className="text-lg font-semibold mt-2" style={{ fontFamily: 'var(--font-fraunces)' }}>{task.title}</p>
      <div className="flex gap-2 mt-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors">
          <Play className="w-3.5 h-3.5" /> start focus session
        </button>
        <button onClick={onUnset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> edit
        </button>
      </div>
    </div>
  );
}