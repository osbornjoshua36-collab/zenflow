import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export default function ScheduleView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateStr = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const dayTasks = await base44.entities.PersonalTask.filter({ scheduled_date: dateStr }, 'scheduled_time', 50);
        setTasks(dayTasks);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [dateStr]);

  const shiftDay = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = dateStr === new Date().toISOString().split('T')[0];

  const toggleComplete = async (task) => {
    await base44.entities.PersonalTask.update(task.id, { completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>📅 My Schedule</h2>
          <p className="text-sm text-muted-foreground">{dateLabel}{isToday ? ' · today' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80">Today</button>
          <button onClick={() => shiftDay(1)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-terracotta text-white hover:bg-terracotta-dark"><Plus className="w-3.5 h-3.5" /> add task</button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80">↷ replan</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-0.5">
          {HOURS.map(hour => {
            const hourTasks = tasks.filter(t => t.scheduled_time && parseInt(t.scheduled_time.split(':')[0]) === hour);
            const hourLabel = hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`;
            return (
              <div key={hour} className="flex gap-3 min-h-[3rem]">
                <div className="w-16 shrink-0 text-xs text-muted-foreground pt-1">{hourLabel}</div>
                <div className="flex-1 border-t border-border pt-1">
                  {hourTasks.map(t => (
                    <button key={t.id} onClick={() => toggleComplete(t)} className="block w-full text-left mb-1 px-3 py-2 rounded-lg bg-card border border-border hover:border-terracotta/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${t.completed ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                        <span className="text-xs text-muted-foreground">{t.scheduled_time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">● tap to complete · ■ drag to reschedule · ↕ resize from bottom</p>
    </div>
  );
}