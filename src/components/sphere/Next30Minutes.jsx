import { useState, useEffect } from 'react';

export default function Next30Minutes({ tasks }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = tasks
    .filter(t => !t.completed && t.scheduled_time)
    .filter(t => {
      const [h, m] = t.scheduled_time.split(':').map(Number);
      const taskMin = h * 60 + m;
      return taskMin >= nowMinutes && taskMin <= nowMinutes + 30;
    })
    .slice(0, 3);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">⚡ next 30 minutes</p>
        <span className="text-xs font-mono text-muted-foreground">{timeStr}</span>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-3">Nothing scheduled right now — breathe.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {upcoming.map(t => (
            <div key={t.id} className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.duration_minutes} min</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}