import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Clock, ShoppingCart } from 'lucide-react';

export default function ProductsDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ activeListings: 0, ordersNeedingAttention: 0, recentActivity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { setLoading(false); return; }
        const [myProducts, allOrders] = await Promise.all([
          base44.entities.Product.filter({ seller_email: me.email }, '-created_date', 100),
          base44.entities.Order.list('-created_date', 50),
        ]);
        const myProductIds = new Set(myProducts.map(p => p.id));
        const myOrders = allOrders.filter(o => myProductIds.has(o.product_id));
        const productMap = {};
        myProducts.forEach(p => { productMap[p.id] = p; });
        setStats({
          activeListings: myProducts.filter(p => p.status === 'Active').length,
          ordersNeedingAttention: myOrders.filter(o => o.status === 'Pending Payment' || o.status === 'Paid').length,
          recentActivity: myOrders.slice(0, 5).map(o => ({
            id: o.id,
            productTitle: (productMap[o.product_id] || {}).title || 'Product',
            amount: o.total_amount,
            status: o.status,
            buyer: o.buyer_email,
          })),
        });
      } catch (e) { console.error('Dashboard error:', e); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>📦 My Products</h2>
        <p className="text-sm text-muted-foreground mt-0.5">browse the marketplace · track your orders · manage your listings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Listings</p>
                <p className="text-2xl font-bold text-slate-900">{stats.activeListings}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Orders Needing Attention</p>
                <p className="text-2xl font-bold text-slate-900">{stats.ordersNeedingAttention}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Recent Orders</p>
                <p className="text-2xl font-bold text-slate-900">{stats.recentActivity.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate?.('browse')}
          className="rounded-xl p-6 bg-card border border-border text-center hover:border-terracotta/40 hover:bg-terracotta-light/50 transition-colors"
        >
          <span className="text-3xl">🛒</span>
          <p className="text-sm font-medium mt-2">Browse Products</p>
          <p className="text-xs text-muted-foreground mt-1">Shop the marketplace — handmade goods, collectibles, and more</p>
        </button>
        <button
          onClick={() => onNavigate?.('my_orders')}
          className="rounded-xl p-6 bg-card border border-border text-center hover:border-terracotta/40 hover:bg-terracotta-light/50 transition-colors"
        >
          <span className="text-3xl">📋</span>
          <p className="text-sm font-medium mt-2">My Orders</p>
          <p className="text-xs text-muted-foreground mt-1">Track your purchases and shipping status</p>
        </button>
        <button
          onClick={() => onNavigate?.('my_listings')}
          className="rounded-xl p-6 bg-card border border-border text-center hover:border-terracotta/40 hover:bg-terracotta-light/50 transition-colors"
        >
          <span className="text-3xl">🏷️</span>
          <p className="text-sm font-medium mt-2">My Listings</p>
          <p className="text-xs text-muted-foreground mt-1">Create, edit, and manage your product listings</p>
        </button>
      </div>

      {!loading && stats.recentActivity.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Activity</h3>
          <div className="space-y-2">
            {stats.recentActivity.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5 text-sm">
                <span className="text-slate-600 truncate">Order for "{a.productTitle}" — ${Number(a.amount).toFixed(2)}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}