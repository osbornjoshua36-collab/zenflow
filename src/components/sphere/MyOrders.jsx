import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, Truck } from 'lucide-react';

const STATUS_COLORS = {
  'Pending Payment': 'bg-amber-100 text-amber-800',
  'Paid': 'bg-blue-100 text-blue-800',
  'Shipped': 'bg-purple-100 text-purple-800',
  'Delivered': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-600',
  'Refunded': 'bg-slate-100 text-slate-600',
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { setLoading(false); return; }
        const myOrders = await base44.entities.Order.filter({ buyer_email: me.email }, '-created_date', 200);
        setOrders(myOrders);
        const productIds = [...new Set(myOrders.map(o => o.product_id).filter(Boolean))];
        if (productIds.length > 0) {
          const productLists = await Promise.all(productIds.map(id => base44.entities.Product.filter({ id })));
          const map = {};
          productLists.flat().forEach(p => { map[p.id] = p; });
          setProducts(map);
        }
      } catch (e) { console.error('MyOrders error:', e); }
      setLoading(false);
    })();
  }, []);

  const counts = {
    all: orders.length,
    'Pending Payment': orders.filter(o => o.status === 'Pending Payment').length,
    'Paid': orders.filter(o => o.status === 'Paid').length,
    'Shipped': orders.filter(o => o.status === 'Shipped').length,
    'Delivered': orders.filter(o => o.status === 'Delivered').length,
  };
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>📋 My Orders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">your purchases and their status</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.keys(counts).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f} ({counts[f]})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No orders {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const product = products[o.product_id];
            return (
              <Card key={o.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-4">
                    {product?.images?.[0] ? (
                      <img src={product.images[0]} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-slate-300" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{product?.title || 'Unknown product'}</h3>
                        <Badge className={STATUS_COLORS[o.status] || ''}>{o.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.quantity} × ${Number(o.unit_price).toFixed(2)} = ${Number(o.total_amount).toFixed(2)}
                        {' · '}<span className="capitalize">{o.fulfillment_method}</span>
                      </p>
                      {o.tracking_number && <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Truck className="w-3 h-3" /> Tracking: {o.tracking_number}</p>}
                      {o.shipping_address && <p className="text-xs text-slate-400 mt-0.5">Ship to: {o.shipping_address}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}