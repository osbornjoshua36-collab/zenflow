import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LogOut, LayoutDashboard, Inbox, Briefcase, Receipt, Users, Tag, Star,
  Settings, HelpCircle, Search, MessageSquare, UserCircle, Globe,
  MoreHorizontal, X, Boxes, MonitorSmartphone
} from 'lucide-react';
import PastDueBanner from '@/components/PastDueBanner';
import { base44 } from '@/api/base44Client';

const SELLER_NAV_CONFIG = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', badgeKey: null },
  { path: '/scheduling', icon: Briefcase, label: 'Jobs', badgeKey: 'jobs', badgeColor: '#3B82F6' },
  { path: '/finance', icon: Receipt, label: 'Finance', badgeKey: 'finance', badgeColor: '#F59E0B' },
  { path: '/clients', icon: Users, label: 'Clients', badgeKey: 'clients', badgeColor: '#F59E0B' },
  { path: '/seller/listings', icon: Tag, label: 'Listings', badgeKey: 'listings', badgeColor: '#F59E0B' },
  { path: '/reputation', icon: Star, label: 'Reviews', badgeKey: 'reviews', badgeColor: '#3B82F6' },
  { path: '/settings/resources', icon: Boxes, label: 'Resources', badgeKey: null },
  { path: '/seller/page', icon: MonitorSmartphone, label: 'My Page', badgeKey: null },
  { path: '/seller/settings', icon: Settings, label: 'Settings', badgeKey: null },
];

const BUYER_NAV = [
  { path: '/community', icon: Search, label: 'Browse Services' },
  { path: '/buyer/jobs', icon: Briefcase, label: 'My Jobs' },
  { path: '/buyer/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/buyer/account', icon: UserCircle, label: 'Account' },
];

const MOBILE_PRIMARY_PATHS = ['/', '/scheduling', '/finance', '/clients', '/seller/settings'];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/leads': 'Leads Pipeline',
  '/scheduling': 'Jobs and Schedule',
  '/finance': 'Finance',
  '/clients': 'Clients',
  '/seller/listings': 'My Listings',
  '/reputation': 'Reviews and Reputation',
  '/seller/page': 'My Sphere Page',
  '/seller/settings': 'Settings',
  '/settings/resources': 'Resources',
  '/settings/appointment-templates': 'Appointment Templates',
  '/settings/appointment-templates': 'Appointment Templates',
  '/seller/subscription': 'Subscription',
  '/seller/analytics': 'Analytics',
  '/seller/ads': 'Ad Manager',
  '/seller/billing': 'Billing',
  '/invoicing': 'Invoicing',
  '/hiring': 'Hiring',
  '/community': 'Browse Services',
  '/support': 'Help and Support',
  '/buyer/jobs': 'My Jobs',
  '/buyer/messages': 'Messages',
};

export default function Layout() {
  const location = useLocation();
  const contentRef = useRef(null);
  const [isSeller, setIsSeller] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [roleView, setRoleView] = useState('buying');
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [badges, setBadges] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { setRoleLoaded(true); return; }
      const me = await base44.auth.me();
      const [businesses, buyerProfiles] = await Promise.all([
        base44.entities.Business.filter({ owner_email: me.email }),
        base44.entities.BuyerProfile.filter({ user_id: me.id }),
      ]);
      const biz = businesses[0] || null;
      const isSel = !!biz && (biz.onboarding_status === 'active' || !!biz.subscription_tier);
      const buyer = buyerProfiles.length > 0;
      if (biz) setSubStatus(biz.subscription_status || null);
      setIsSeller(isSel);
      setIsBuyer(buyer);
      setRoleView(isSel && !buyer ? 'selling' : 'buying');
      setRoleLoaded(true);
      if (isSel && biz) fetchBadges(biz.id);
    })();
  }, []);

  const fetchBadges = async (bizId) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [allLeads, todayJobs, pendingInvoices, allListings, allReviews] = await Promise.all([
      base44.entities.ServiceRequest.filter({ status: 'Open' }, '-created_date', 200),
      base44.entities.Job.filter({ business_id: bizId }, '-scheduled_date', 100),
      base44.entities.Invoice.filter({ business_id: bizId }, '-created_date', 200),
      base44.entities.Listing.filter({ business_id: bizId }, '-created_date', 200),
      base44.entities.Review.filter({ business_id: bizId }, '-created_date', 200),
    ]);

    const leadsCount = allLeads.filter(l => !l.responses_received || l.responses_received === 0).length;
    const jobsTodayCount = todayJobs.filter(j => j.scheduled_date >= todayStart && j.scheduled_date < todayEnd).length;
    const financeCount = pendingInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length;
    const listingsCount = allListings.filter(l => l.status === 'Paused' || l.status === 'Draft').length;
    const reviewsCount = allReviews.filter(r => r.created_date >= thirtyDaysAgo && r.status !== 'Responded').length;

    setBadges({ leads: leadsCount, jobs: jobsTodayCount, finance: financeCount, clients: 0, listings: listingsCount, reviews: reviewsCount });
  };

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.scrollTop = 0;
      setTimeout(() => { el.scrollTop = 0; }, 50);
    }
  }, [location.pathname]);

  const isDual = isSeller && isBuyer;
  const isSellerView = isSeller && (roleView === 'selling' || !isDual);

  let modules;
  if (!isSeller && !isBuyer) {
    modules = [{ path: '/community', icon: Globe, label: 'Browse Services' }];
  } else if (isDual) {
    modules = roleView === 'selling' ? SELLER_NAV_CONFIG : BUYER_NAV;
  } else if (isSeller) {
    modules = SELLER_NAV_CONFIG;
  } else {
    modules = BUYER_NAV;
  }

  const formatBadge = (n) => n > 99 ? '99+' : String(n);
  const pageTitle = PAGE_TITLES[location.pathname] || modules.find(m => m.path === location.pathname)?.label || '';
  const mobilePrimaryItems = SELLER_NAV_CONFIG.filter(m => MOBILE_PRIMARY_PATHS.includes(m.path));

  const handleLogout = async () => { await base44.auth.logout(); };

  const renderNavItem = (mod, onClick) => {
    const Icon = mod.icon;
    const isActive = location.pathname === mod.path;
    const badgeCount = mod.badgeKey ? (badges[mod.badgeKey] || 0) : 0;
    return (
      <Link
        key={mod.path}
        to={mod.path}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors"
        style={isActive
          ? { background: 'var(--nav-active)', color: 'var(--nav-active-text)' }
          : { color: 'var(--nav-text-muted)' }
        }
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)'; } }}
      >
        <span className="relative shrink-0">
          <Icon className="w-5 h-5" />
          {badgeCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-white"
              style={{ fontSize: '10px', fontWeight: 500, background: mod.badgeColor || '#EF4444', lineHeight: 1 }}
            >
              {formatBadge(badgeCount)}
            </span>
          )}
        </span>
        <span className="text-sm font-medium">{mod.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen" style={{ background: '#FAFCFF', fontFamily: 'var(--font-dm-sans)' }}>
      {/* Sidebar hidden on mobile */}
      <div className="hidden md:flex w-64 flex-col shrink-0" style={{ background: 'var(--nav-bg)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid var(--nav-border)' }}>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>Sphere</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--nav-text-muted)' }}>
            {isSellerView ? 'Service Professional Dashboard' : 'AI Communication Platform'}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {modules.map((mod) => renderNavItem(mod))}
        </nav>

        {!isSeller && (
          <div className="px-4 pb-3">
            <Link
              to="/seller/onboarding"
              className="block w-full text-center text-xs px-3 py-2 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--nav-hover)', color: 'var(--nav-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--nav-text-muted)'; }}
            >
              Create a Business Account
            </Link>
          </div>
        )}

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

        <div className="px-4 pb-2">
          <Link
            to="/support"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--nav-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)'; }}
          >
            <HelpCircle className="w-4 h-4" />
            Help and Support
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
            {pageTitle}
          </h2>
        </div>
        <div id="main-scroll" ref={contentRef} className="flex-1 overflow-y-auto p-8 pb-20 md:pb-8" style={{ background: '#FAFCFF' }}>
          {isSeller && <PastDueBanner status={subStatus} />}
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom tab bar — seller only */}
      {isSellerView && (
        <>
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}>
            {mobilePrimaryItems.map(mod => {
              const Icon = mod.icon;
              const isActive = location.pathname === mod.path;
              const badgeCount = mod.badgeKey ? (badges[mod.badgeKey] || 0) : 0;
              return (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
                  style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-text-muted)' }}
                >
                  <span className="relative">
                    <Icon className="w-5 h-5" />
                    {badgeCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-white"
                        style={{ fontSize: '9px', fontWeight: 600, background: mod.badgeColor || '#EF4444' }}
                      >
                        {formatBadge(badgeCount)}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '10px' }}>{mod.label}</span>
                </Link>
              );
            })}
            <button
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              style={{ color: 'var(--nav-text-muted)' }}
              onClick={() => setMobileDrawerOpen(true)}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span style={{ fontSize: '10px' }}>More</span>
            </button>
          </div>

          {mobileDrawerOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
              <div className="relative rounded-t-2xl p-4" style={{ background: 'var(--nav-bg)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">Menu</span>
                  <button onClick={() => setMobileDrawerOpen(false)}>
                    <X className="w-5 h-5" style={{ color: 'var(--nav-text-muted)' }} />
                  </button>
                </div>
                {SELLER_NAV_CONFIG.map(mod => renderNavItem(mod, () => setMobileDrawerOpen(false)))}
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--nav-border)' }}>
                  <Link
                    to="/support"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
                    style={{ color: 'var(--nav-text-muted)' }}
                  >
                    <HelpCircle className="w-5 h-5" />
                    Help and Support
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
                    style={{ color: 'var(--nav-text-muted)' }}
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}