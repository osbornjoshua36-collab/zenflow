import { useState } from 'react';
import ProductsDashboard from '@/components/sphere/ProductsDashboard';
import BrowseProducts from '@/components/sphere/BrowseProducts';
import MyOrders from '@/components/sphere/MyOrders';
import MyListings from '@/components/sphere/MyListings';

const SUB_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'browse', label: 'Browse Products' },
  { id: 'my_orders', label: 'My Orders' },
  { id: 'my_listings', label: 'My Listings' },
];

export default function ProductsView() {
  const [activeSub, setActiveSub] = useState('dashboard');

  const renderContent = () => {
    switch (activeSub) {
      case 'dashboard': return <ProductsDashboard onNavigate={setActiveSub} />;
      case 'browse': return <BrowseProducts />;
      case 'my_orders': return <MyOrders />;
      case 'my_listings': return <MyListings />;
      default: return <ProductsDashboard onNavigate={setActiveSub} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSub(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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