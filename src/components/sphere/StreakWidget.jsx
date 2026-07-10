export default function StreakWidget({ entries }) {
  const today = new Date();
  let streak = 0;
  const entryDates = new Set(entries.map(e => e.entry_date));

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (entryDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>{streak}</p>
          <p className="text-xs text-muted-foreground">day win streak</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">keep logging daily wins</p>
      <button className="mt-2 text-xs font-medium text-sage hover:underline">share 🌿</button>
    </div>
  );
}