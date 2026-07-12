import { useState } from 'react';
import CommunityHub from '@/pages/CommunityHub';
import BuyerDashboard from '@/pages/BuyerDashboard';
import ServicesDashboard from '@/components/sphere/ServicesDashboard';

const SUB_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'browse', label: 'Browse Services' },
  { id: 'my_jobs', label: 'My Jobs' },
];

export default function ServicesView() {
  const [activeSub, setActiveSub] = useState('dashboard');

  const renderContent = () => {
    switch (activeSub) {
      case 'dashboard': return <ServicesDashboard onNavigate={setActiveSub} />;
      case 'browse': return <CommunityHub />;
      case 'my_jobs': return <BuyerDashboard />;
      default: return <ServicesDashboard />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSub(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSub === tab.id
                ? 'border-terracotta text-terracotta-dark'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}