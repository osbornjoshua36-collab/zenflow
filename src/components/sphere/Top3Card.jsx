export default function Top3Card({ tasks, onSet }) {
  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <p className="text-xs font-medium text-muted-foreground">📋 top 3 for today</p>
      {tasks.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">Priorities not set yet today</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tap the button below to choose your top 3.</p>
          <button onClick={onSet} className="mt-2 text-xs font-medium text-terracotta-dark hover:underline">
            📋 set today's priorities
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {tasks.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-terracotta/15 text-terracotta-dark text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm font-medium">{t.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}