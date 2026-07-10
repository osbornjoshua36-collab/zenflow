export default function CircleView() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>💬 My Circle</h2>
        <p className="text-sm text-muted-foreground mt-0.5">the people who matter — private, encrypted, close</p>
      </div>

      <div className="rounded-xl p-8 bg-card border border-border text-center">
        <span className="text-4xl">💬</span>
        <p className="text-sm font-medium mt-3">Your circle is ready to grow</p>
        <p className="text-xs text-muted-foreground mt-1">Connect with the people who matter most — partner, family, close friends. Messages are end-to-end encrypted.</p>
        <button className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-terracotta text-white hover:bg-terracotta-dark">+ new message</button>
      </div>
    </div>
  );
}