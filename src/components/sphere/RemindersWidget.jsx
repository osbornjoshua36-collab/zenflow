export default function RemindersWidget({ tasks }) {
  const now = new Date();
  const upcoming = tasks
    .filter(t => !t.completed && t.scheduled_time)
    .filter(t => new Date(t.scheduled_date + 'T' + t.scheduled_time) >= now)
    .sort((a, b) => (a.scheduled_date + a.scheduled_time).localeCompare(b.scheduled_date + b.scheduled_time))
    .slice(0, 4);

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <p className="text-xs font-medium text-muted-foreground">🔔 upcoming reminders</p>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-3">No upcoming reminders.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {upcoming.map(t => {
            const d = new Date(t.scheduled_date + 'T' + t.scheduled_time);
            const label = d.toLocaleDateString('en-US', { weekday: 'short' }) + ' · ' + t.scheduled_time;
            const isToday = t.scheduled_date === new Date().toISOString().split('T')[0];
            return (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-lg">{t.category === 'health' ? '💊' : t.is_recurring ? '🔄' : '📞'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{label}{isToday ? ' · today' : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}