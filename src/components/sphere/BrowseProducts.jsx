import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Package, ShoppingCart, MessageCircle, Truck, Store } from 'lucide-react';
import BuyProductDialog from '@/components/products/BuyProductDialog';

const CATEGORIES = ['All', 'Handmade & Crafts', 'Home Goods', 'Clothing & Accessories', 'Electronics', 'Collectibles', 'Other'];

export default function BrowseProducts() {
  const [products, setProducts] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [buyProduct, setBuyProduct] = useState(null);
  const [me, setMe] = useState(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        const items = await base44.entities.Product.filter({ status: 'Active' }, '-created_date', 200);
        setProducts(items);
        const bizIds = [...new Set(items.map(p => p.business_id).filter(Boolean))];
        if (bizIds.length > 0) {
          const bizLists = await Promise.all(bizIds.map(id => base44.entities.Business.filter({ id })));
          const map = {};
          bizLists.flat().forEach(b => { map[b.id] = b; });
          setBusinesses(map);
        }
      } catch (e) { console.error('Browse error:', e); }
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter(p => {
    if (category !== 'All' && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const openDetail = (p) => { setSelected(p); setMsgOpen(false); setMsgText(''); setMsgSent(false); };
  const closeDetail = () => { setSelected(null); setMsgOpen(false); setMsgText(''); setMsgSent(false); };

  const handleBuy = (product) => { setSelected(null); setBuyProduct(product); };

  const handleMessage = async () => {
    if (!selected || !msgText.trim() || !me) return;
    const product = selected;
    if (product.business_id) {
      const conv = await base44.entities.Conversation.create({
        business_id: product.business_id,
        buyer_name: me.full_name || me.email,
        buyer_email: me.email,
        subject: `Regarding: ${product.title}`,
        status: 'Open',
      });
      await base44.entities.Message.create({
        business_id: product.business_id,
        conversation_id: conv.id,
        direction: 'Inbound',
        content: msgText.trim(),
        channel: 'Email',
        sender: me.full_name || me.email,
      });
      await base44.entities.Conversation.update(conv.id, { last_message_at: new Date().toISOString() });
    } else if (product.seller_email) {
      const subject = encodeURIComponent(`Regarding: ${product.title}`);
      const body = encodeURIComponent(msgText.trim());
      window.open(`mailto:${product.seller_email}?subject=${subject}&body=${body}`);
    }
    setMsgSent(true);
  };

  const sellerName = (p) => p.business_id ? (businesses[p.business_id]?.business_name || businesses[p.business_id]?.name || 'Business seller') : 'Individual seller';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>🛒 Browse Products</h2>
        <p className="text-sm text-muted-foreground mt-0.5">shop the marketplace — from every seller</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input className="pl-10" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${category === c ? 'text-white border-transparent' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              style={category === c ? { background: '#E8945A' } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500 mt-3">No products found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => {
            const img = p.images?.[0];
            return (
              <button key={p.id} onClick={() => openDetail(p)}
                className="text-left rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-slate-100">
                  {img ? <img src={img} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-slate-300" /></div>}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{p.title}</h3>
                  <p className="text-xs text-slate-500">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-slate-900">${Number(p.price).toFixed(2)}</span>
                    {p.condition && p.condition !== 'New' && <span className="text-xs text-slate-400">{p.condition}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{sellerName(p)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
              {selected.images?.length > 0 ? (
                <div className="space-y-2">
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                    <img src={selected.images[0]} alt={selected.title} className="w-full h-full object-cover" />
                  </div>
                  {selected.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {selected.images.map((url, i) => (
                        <img key={i} src={url} alt={`${selected.title} ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center"><Package className="w-12 h-12 text-slate-300" /></div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">${Number(selected.price).toFixed(2)}</span>
                  <span className="text-sm text-slate-500">{selected.quantity_available} available</span>
                </div>
                {selected.condition && <p className="text-sm text-slate-500">Condition: {selected.condition}</p>}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {selected.fulfillment_method === 'Shipping' && <><Truck className="w-4 h-4" /> Shipping available</>}
                  {selected.fulfillment_method === 'Local Pickup' && <><Store className="w-4 h-4" /> Local pickup</>}
                  {selected.fulfillment_method === 'Both' && <><Truck className="w-4 h-4" /> Shipping & Local pickup</>}
                  {selected.shipping_flat_rate != null && selected.fulfillment_method !== 'Local Pickup' && <span className="text-slate-400">(+${Number(selected.shipping_flat_rate).toFixed(2)})</span>}
                </div>
                {selected.description && <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{selected.description}</p>}
                <p className="text-xs text-slate-400">Sold by {sellerName(selected)}</p>
              </div>
              {!msgSent ? (
                !msgOpen ? (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 gap-2" style={{ background: '#E8945A', color: '#fff' }} onClick={() => handleBuy(selected)}>
                      <ShoppingCart className="w-4 h-4" /> Buy Now
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setMsgOpen(true)}>
                      <MessageCircle className="w-4 h-4" /> Message Seller
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <textarea className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" rows={3} placeholder="Type your message to the seller..." value={msgText} onChange={e => setMsgText(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setMsgOpen(false)}>Cancel</Button>
                      <Button className="flex-1 gap-2" disabled={!msgText.trim()} onClick={handleMessage}>
                        <MessageCircle className="w-4 h-4" /> Send Message
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-medium">Message sent!</p>
                  <p className="text-xs text-slate-500 mt-1">Check My Circle for replies from the seller.</p>
                  <Button variant="outline" className="mt-3" onClick={closeDetail}>Close</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <BuyProductDialog product={buyProduct} onClose={() => setBuyProduct(null)} buyerEmail={me?.email} />
    </div>
  );
}