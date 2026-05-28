import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, BarChart3, MessageSquare, Calendar, CheckCircle, Star, DollarSign, Users, Globe, Tag, Megaphone, CreditCard, Settings, Search, Briefcase, UserCircle, Layers, LineChart, HelpCircle } from 'lucide-react';
import PastDueBanner from '@/components/PastDueBanner';
import { base44 } from '@/api/base44Client';

const SELLER_NAV = [
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
  { path: '/seller/billing', icon: CreditCard, label: 'Billing' },
  { path: '/seller/settings', icon: Settings, label: 'Settings' },
  { path: '/seller/subscription', icon: Layers, label: 'Subscription' },
  { path: '/seller/analytics', icon: LineChart, label: 'Analytics' },
];

const BUYER_NAV = [
  { path: '/community', icon: Search, label: 'Browse Services' },
  { path: '/buyer/jobs', icon: Briefcase, label: 'My Jobs' },
  { path: '/buyer/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/buyer/account', icon: UserCircle, label: 'Account' },
];

export default function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const [isSeller, setIsSeller] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [roleView, setRoleView] = useState('buying');
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { setRoleLoaded(true); return; }
      const me = await base44.auth.me();
      const [businesses, buyerProfiles] = await Promise.all([
        base44.entities.Business.filter({ owner_email: me.email }),
        base44.entities.BuyerProfile.filter({ user_id: me.id }),
      ]);
      const seller = businesses.length > 0;
      const buyer = buyerProfiles.length > 0;
      if (businesses[0]) setSubStatus(businesses[0].subscription_status || null);
      setIsSeller(seller);
      setIsBuyer(buyer);
      setRoleView(seller && !buyer ? 'selling' : 'buying');
      setRoleLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.scrollTop = 0;
      setTimeout(() => { el.scrollTop = 0; }, 50);
    }
  }, [location.pathname]);

  const isDual = isSeller && isBuyer;
  let modules;
  if (!isSeller && !isBuyer) {
    modules = [{ path: '/community', icon: Globe, label: 'Browse Services' }];
  } else if (isDual) {
    modules = roleView === 'selling' ? SELLER_NAV : BUYER_NAV;
  } else if (isSeller) {
    modules = SELLER_NAV;
  } else {
    modules = BUYER_NAV;
  }

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

        {/* Become a Seller CTA — shown only to buyer-only users */}
        {isBuyer && !isSeller && (
          <div className="px-4 pb-3">
            <Link
              to="/seller/settings"
              className="block w-full text-center text-xs px-3 py-2 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--nav-hover)', color: 'var(--nav-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--nav-text-muted)'; }}
            >
              List your services — become a seller →
            </Link>
          </div>
        )}

        {/* Dual-role switcher */}
        {isDual && (
          <div className="px-4 pb-3">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--nav-border)' }}>
              <button
                onClick={() => setRoleView('buying')}
                className="flex-1 text-xs py-2 font-medium transition-colors"
                style={roleView === 'buying'
                  ? { background: 'var(--nav-active)', color: 'var(--nav-active-text)' }
                  : { color: 'var(--nav-text-muted)' }}
              >Buying</button>
              <button
                onClick={() => setRoleView('selling')}
                className="flex-1 text-xs py-2 font-medium transition-colors"
                style={roleView === 'selling'
                  ? { background: 'var(--nav-active)', color: 'var(--nav-active-text)' }
                  : { color: 'var(--nav-text-muted)' }}
              >Selling</button>
            </div>
          </div>
        )}

        {/* Help link */}
        <div className="px-4 pb-2">
          <Link
            to="/support"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--nav-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)'; }}
          >
            <HelpCircle className="w-4 h-4" />
            Help & Support
          </Link>
        </div>
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
        <div id="main-scroll" ref={contentRef} className="flex-1 overflow-y-auto p-8" style={{ background: '#FAFCFF' }}>
          {isSeller && <PastDueBanner status={subStatus} />}
          <Outlet />
        </div>
      </div>
    </div>
  );
}