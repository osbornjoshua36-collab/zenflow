import { useState } from 'react';
import { Sun, Calendar, Target, MessageCircle, ShoppingBag, Building2, Brain, LogOut, MoreHorizontal, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MyView from '@/components/sphere/MyView';
import ScheduleView from '@/components/sphere/ScheduleView';
import GoalsView from '@/components/sphere/GoalsView';
import CircleView from '@/components/sphere/CircleView';
import BrainView from '@/components/sphere/BrainView';
import BusinessDashboard from '@/components/sphere/BusinessDashboard';
import ServicesView from '@/components/sphere/ServicesView';

const NAV_ITEMS = [
  { id: 'my_view', icon: Sun, label: 'My View' },
  { id: 'my_schedule', icon: Calendar, label: 'My Schedule' },
  { id: 'my_goals', icon: Target, label: 'My Goals' },
  { id: 'my_circle', icon: MessageCircle, label: 'My Circle' },
  { id: 'my_services', icon: ShoppingBag, label: 'My Services' },
  { id: 'my_business', icon: Building2, label: 'My Business' },
  { id: 'my_brain', icon: Brain, label: 'My Brain' },
];

const MOBILE_PRIMARY = ['my_view', 'my_schedule', 'my_services', 'my_business'];

export default function SphereShell() {
  const [activeTab, setActiveTab] = useState('my_view');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const handleLogout = async () => { await base44.auth.logout(); };

  const renderContent = () => {
    switch (activeTab) {
      case 'my_view': return <MyView />;
      case 'my_schedule': return <ScheduleView />;
      case 'my_goals': return <GoalsView />;
      case 'my_circle': return <CircleView />;
      case 'my_services': return <ServicesView />;
      case 'my_business': return <BusinessDashboard />;
      case 'my_brain': return <BrainView />;
      default: return <MyView />;
    }
  };

  const renderNavItem = (item, onClick) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button key={item.id} onClick={() => { setActiveTab(item.id); onClick?.(); }}
        className="flex items-center gap-3 px-4 py-3 rounded-lg mb-1 w-full transition-colors"
        style={isActive ? { background: 'var(--nav-active)', color: 'var(--nav-active-text)' } : { color: 'var(--nav-text-muted)' }}>
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen" style={{ background: '#FAFCFF', fontFamily: 'var(--font-dm-sans)' }}>
      <div className="hidden md:flex w-64 flex-col shrink-0" style={{ background: 'var(--nav-bg)' }}>
        <div className="p-6" style={{ borderBottom: '1px solid var(--nav-border)' }}>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>Sphere</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--nav-text-muted)' }}>everyone you need, in one place</p>
          <p className="text-xs mt-2" style={{ color: 'var(--nav-text-muted)' }}>{today}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          {NAV_ITEMS.map(item => renderNavItem(item))}
        </nav>
        <div className="p-4" style={{ borderTop: '1px solid var(--nav-border)' }}>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors" style={{ color: 'var(--nav-text-muted)' }}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden px-4 py-3 flex items-center justify-between" style={{ background: 'var(--nav-bg)' }}>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-fraunces)' }}>Sphere</h1>
          <span className="text-xs" style={{ color: 'var(--nav-text-muted)' }}>{today}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8" style={{ background: '#FAFCFF' }}>
          {renderContent()}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)' }}>
        {NAV_ITEMS.filter(i => MOBILE_PRIMARY.includes(i.id)).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5" style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-text-muted)' }}>
              <Icon className="w-5 h-5" />
              <span style={{ fontSize: '10px' }}>{item.label.replace('My ', '')}</span>
            </button>
          );
        })}
        <button onClick={() => setMobileDrawerOpen(true)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5" style={{ color: 'var(--nav-text-muted)' }}>
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
              <button onClick={() => setMobileDrawerOpen(false)}><X className="w-5 h-5" style={{ color: 'var(--nav-text-muted)' }} /></button>
            </div>
            {NAV_ITEMS.map(item => renderNavItem(item, () => setMobileDrawerOpen(false)))}
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--nav-border)' }}>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm" style={{ color: 'var(--nav-text-muted)' }}>
                <LogOut className="w-5 h-5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}