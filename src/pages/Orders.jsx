import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Package, Truck, CheckCircle, Clock, X } from 'lucide-react';

const STATUS_COLORS = {
  'Pending Payment': 'bg-amber-100 text-amber-800',
  'Paid': 'bg-blue-100 text-blue-800',
  'Shipped': 'bg-purple-100 text-purple-800',
  'Delivered': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-600',
  'Refunded': 'bg-slate-100 text-slate-600',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [shipOrder, setShipOrder] = useState(null);
  const [tracking, setTracking] = useState('');

  const loadData = async () => {
    const bizList = await base44.entities.Business.list('-created_date', 1);
    const biz = bizList[0];
    const [productList, orderList] = await Promise.all([
      base44.entities.Product.filter({ business_id: biz?.id || 'none' }, '-created_date', 200),
      base44.entities.Order.list('-created_date', 200),
    ]);
    const productIds = new Set(productList.map(p => p.id));
    setProducts(productList);
    setOrders(orderList.filter(o => productIds.has(o.product_id)));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkShipped = async () => {
    await base44.entities.Order.update(shipOrder.id, { status: 'Shipped', tracking_number: tracking });
    setShipOrder(null); setTracking(''); loadData();
  };

  const handleMarkDelivered = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'Delivered' });
    loadData();
  };

  const productFor = (id) => products.find(p => p.id === id);
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const counts = {
    all: orders.length,
    'Pending Payment': orders.filter(o => o.status === 'Pending Payment').length,
    'Paid': orders.filter(o => o.status === 'Paid').length,
    'Shipped': orders.filter(o => o.status === 'Shipped').length,
    'Delivered': orders.filter(o => o.status === 'Delivered').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: counts.all, icon: ShoppingCart, color: 'text-slate-600' },
          { label: 'Awaiting Payment', value: counts['Pending Payment'], icon: Clock, color: 'text-amber-600' },
          { label: 'To Ship', value: counts['Paid'], icon: Package, color: 'text-blue-600' },
          { label: 'Delivered', value: counts['Delivered'], icon: CheckCircle, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.keys(counts).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f} ({counts[f]})
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No orders {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const product = productFor(o.product_id);
            return (
              <Card key={o.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-start flex-1 min-w-0">
                      {product?.images?.[0] ? (
                        <img src={product.images[0]} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-slate-300" /></div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 truncate">{product?.title || 'Unknown product'}</h3>
                          <Badge className={STATUS_COLORS[o.status] || ''}>{o.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {o.quantity} × ${Number(o.unit_price).toFixed(2)} = ${Number(o.total_amount).toFixed(2)}
                          {' · '}<span className="capitalize">{o.fulfillment_method}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Buyer: {o.buyer_email}</p>
                        {o.tracking_number && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Truck className="w-3 h-3" /> Tracking: {o.tracking_number}</p>}
                        {o.shipping_address && <p className="text-xs text-slate-400 mt-0.5">Ship to: {o.shipping_address}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {o.status === 'Paid' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => { setShipOrder(o); setTracking(o.tracking_number || ''); }}>
                          <Truck className="w-3 h-3" /> Ship
                        </Button>
                      )}
                      {o.status === 'Shipped' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleMarkDelivered(o)}>
                          <CheckCircle className="w-3 h-3" /> Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!shipOrder} onOpenChange={() => setShipOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mark as Shipped</DialogTitle></DialogHeader>
          <div>
            <Label>Tracking Number</Label>
            <Input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Enter carrier tracking number" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipOrder(null)}>Cancel</Button>
            <Button onClick={handleMarkShipped} disabled={!tracking}>Ship Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}