import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, MapPin } from 'lucide-react';

export default function BuyProductDialog({ product, onClose, buyerEmail }) {
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState(product?.fulfillment_method === 'Shipping' ? 'Shipping' : 'Local Pickup');
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!product) return null;

  const canShip = product.fulfillment_method === 'Shipping' || product.fulfillment_method === 'Both';
  const canPickup = product.fulfillment_method === 'Local Pickup' || product.fulfillment_method === 'Both';
  const shipping = fulfillment === 'Shipping' && canShip ? (product.shipping_flat_rate || 0) : 0;
  const total = (Number(product.price) * quantity) + shipping;

  const handleBuy = async () => {
    if (fulfillment === 'Shipping' && !shippingAddress) return;
    setLoading(true);
    await base44.entities.Order.create({
      product_id: product.id,
      buyer_email: buyerEmail,
      buyer_name: '',
      quantity,
      unit_price: Number(product.price),
      total_amount: total,
      shipping_amount: shipping,
      fulfillment_method: fulfillment,
      shipping_address: fulfillment === 'Shipping' ? shippingAddress : null,
      status: 'Pending Payment',
    });
    setLoading(false);
    setDone(true);
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Buy Now
          </DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-medium">Order placed!</p>
            <p className="text-sm text-slate-500 mt-1">The seller will be notified. Complete payment to confirm your order.</p>
            <Button className="mt-4" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              {product.images?.[0] ? (
                <img src={product.images[0]} className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-slate-100" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{product.title}</h3>
                <p className="text-lg font-bold text-slate-900">${Number(product.price).toFixed(2)}</p>
                <p className="text-xs text-slate-500">{product.quantity_available} available</p>
              </div>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" max={product.quantity_available} value={quantity} onChange={e => setQuantity(Math.min(parseInt(e.target.value) || 1, product.quantity_available))} />
            </div>
            {(canShip && canPickup) && (
              <div>
                <Label>Fulfillment</Label>
                <div className="flex gap-2">
                  <button onClick={() => setFulfillment('Local Pickup')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${fulfillment === 'Local Pickup' ? 'border-terracotta bg-terracotta-light' : 'border-slate-200'}`}>Local Pickup</button>
                  <button onClick={() => setFulfillment('Shipping')} className={`flex-1 px-3 py-2 rounded-lg border text-sm ${fulfillment === 'Shipping' ? 'border-terracotta bg-terracotta-light' : 'border-slate-200'}`}>Shipping</button>
                </div>
              </div>
            )}
            {fulfillment === 'Shipping' && canShip && (
              <div>
                <Label>Shipping Address</Label>
                <Textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={2} placeholder="Enter your full shipping address" />
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${(Number(product.price) * quantity).toFixed(2)}</span></div>
              {shipping > 0 && <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>${shipping.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleBuy} disabled={loading || (fulfillment === 'Shipping' && !shippingAddress)}>
                {loading ? 'Placing order…' : 'Place Order'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}