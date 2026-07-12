import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

const LAYOUT_PREFIXES = [
  '/leads', '/scheduling', '/post-job', '/reputation', '/invoicing',
  '/hiring', '/community', '/seller', '/support', '/finance',
  '/clients', '/jobs', '/settings',
];

export default function BackToHome() {
  const location = useLocation();
  if (location.pathname === '/') return null;
  const isLayoutPage = LAYOUT_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
  if (isLayoutPage) return null;

  return (
    <Link
      to="/"
      className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 backdrop-blur shadow-md border border-border hover:bg-white transition-colors"
    >
      <Home className="w-4 h-4 text-terracotta" />
      <span className="text-sm font-medium text-foreground">Home</span>
    </Link>
  );
}