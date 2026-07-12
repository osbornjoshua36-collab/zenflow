export default function ServicesDashboard({ onNavigate }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>🛍️ My Services</h2>
        <p className="text-sm text-muted-foreground mt-0.5">find services · track your jobs · manage everything in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate?.('browse')}
          className="rounded-xl p-6 bg-card border border-border text-center hover:border-terracotta/40 hover:bg-terracotta-light/50 transition-colors"
        >
          <span className="text-3xl">🔍</span>
          <p className="text-sm font-medium mt-2">Browse Services</p>
          <p className="text-xs text-muted-foreground mt-1">Find local service professionals for any job</p>
        </button>
        <button
          onClick={() => onNavigate?.('my_jobs')}
          className="rounded-xl p-6 bg-card border border-border text-center hover:border-terracotta/40 hover:bg-terracotta-light/50 transition-colors"
        >
          <span className="text-3xl">📋</span>
          <p className="text-sm font-medium mt-2">My Jobs</p>
          <p className="text-xs text-muted-foreground mt-1">Track your active and past service jobs</p>
        </button>
      </div>

      <div className="rounded-xl p-4 bg-terracotta-light border border-terracotta/20">
        <p className="text-sm text-foreground">💬 All your communications — messages from sellers, quotes, and job updates — now live in <strong>My Circle</strong>. Check there for all your conversations.</p>
      </div>
    </div>
  );
}