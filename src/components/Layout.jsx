import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, MessageSquare, Calendar, CheckCircle, Star, DollarSign, Users, Globe, Tag, Megaphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout() {
  const location = useLocation();
  const modules = [
    { path: '/', icon: BarChart3, label: 'Dashboard' },
    { path: '/leads', icon: MessageSquare, label: 'Leads' },
    { path: '/scheduling', icon: Calendar, label: 'Scheduling' },
    { path: '/post-job', icon: CheckCircle, label: 'Post-Job' },
    { path: '/reputation', icon: Star, label: 'Reputation' },
    { path: '/invoicing', icon: DollarSign, label: 'Invoicing' },
    { path: '/hiring', icon: Users, label: 'Hiring' },
    { path: '/community', icon: Globe, label: 'Community Hub' },
    { path: '/seller/listings', icon: Tag, label: 'My Listings' },
    { path: '/seller/ads', icon: Megaphone, label: 'Ad Manager' },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="flex h-screen" style={{ background: '#FAFCFF', fontFamily: 'var(--font-dm-sans)' }}>
      {/* Sidebar */}
      <div className="w-64 flex flex-col" style={{ background: 'var(--nav-bg)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid var(--nav-border)' }}>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>Sphere</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--nav-text-muted)' }}>AI Communication Platform</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = location.pathname === mod.path;
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className="flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors"
                style={isActive
                  ? { background: 'var(--nav-active)', color: 'var(--nav-active-text)' }
                  : { color: 'var(--nav-text-muted)' }
                }
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)'; } }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{mod.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--nav-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--nav-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)'; }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-4 flex items-center" style={{ background: 'var(--nav-header-bg)', borderBottom: '1px solid var(--nav-border)' }}>
          <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>
            {modules.find(m => m.path === location.pathname)?.label || 'App'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-8" style={{ background: '#FAFCFF' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}