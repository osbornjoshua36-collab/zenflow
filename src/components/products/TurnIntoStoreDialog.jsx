import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Store, CheckCircle2, Loader2 } from 'lucide-react';
import { generateSlug } from '@/utils/sellerUtils';

export default function TurnIntoStoreDialog({ open, onClose, onDone }) {
  const [step, setStep] = useState('loading'); // loading | setup | select
  const [existingBusiness, setExistingBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState({});
  const [form, setForm] = useState({
    business_name: '', owner_phone: '', business_address_line1: '',
    business_city: '', business_state: '', business_zip: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('loading');
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setStep('setup'); return; }
      const [businesses, myProducts] = await Promise.all([
        base44.entities.Business.filter({ owner_email: me.email }),
        base44.entities.Product.filter({ seller_email: me.email }, '-created_date', 200),
      ]);
      const productsBiz = businesses.find(b => b.business_type === 'products');
      setProducts(myProducts);
      const sel = {};
      myProducts.forEach(p => { sel[p.id] = true; });
      setSelected(sel);
      if (productsBiz) {
        setExistingBusiness(productsBiz);
        setStep('select');
      } else {
        setStep('setup');
      }
    })();
  }, [open]);

  const toggle = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const checkedCount = Object.values(selected).filter(Boolean).length;
  const setupValid = form.business_name && form.owner_phone && form.business_address_line1
    && form.business_city && form.business_state && form.business_zip;

  const handleCreateAndMove = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      let businessId = existingBusiness?.id;
      if (!businessId) {
        const names = (me?.full_name || '').trim().split(' ');
        const biz = await base44.entities.Business.create({
          business_name: form.business_name,
          slug: generateSlug(form.business_name),
          owner_first_name: names[0] || '',
          owner_last_name: names.slice(1).join(' ') || '',
          owner_email: me.email,
          owner_phone: form.owner_phone,
          business_address_line1: form.business_address_line1,
          business_city: form.business_city,
          business_state: form.business_state,
          business_zip: form.business_zip,
          business_type: 'products',
          service_radius_miles: 25,
          onboarding_status: 'incomplete',
          subscription_plan: 'starter',
          subscription_tier: 'none',
        });
        businessId = biz.id;
      }
      const toMove = products.filter(p => selected[p.id]);
      if (toMove.length > 0) {
        await base44.entities.Product.bulkUpdate(
          toMove.map(p => ({ id: p.id, business_id: businessId, seller_email: null }))
        );
      }
      onDone?.();
      onClose();
    } catch (e) {
      console.error('Turn into store failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-terracotta" /> Turn your listings into a store
          </DialogTitle>
        </DialogHeader>

        {step === 'loading' && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a store for your products. You'll get a storefront, order tracking, and lower commission rates as you grow.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Store name</Label>
                <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="e.g. Sarah's Handmade Goods" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.owner_phone} onChange={e => setForm({ ...form, owner_phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.business_address_line1} onChange={e => setForm({ ...form, business_address_line1: e.target.value })} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>City</Label>
                  <Input value={form.business_city} onChange={e => setForm({ ...form, business_city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.business_state} onChange={e => setForm({ ...form, business_state: e.target.value })} placeholder="NC" maxLength={2} />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input value={form.business_zip} onChange={e => setForm({ ...form, business_zip: e.target.value })} />
                </div>
              </div>
            </div>
            <Button className="w-full" disabled={!setupValid} onClick={() => setStep('select')}>Continue</Button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which listings to move into {existingBusiness ? 'your store' : 'your new store'}. Unchecked listings stay as casual personal listings.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                  <Checkbox checked={!!selected[p.id]} onCheckedChange={() => toggle(p.id)} />
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Store className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)}</p>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              {!existingBusiness && (
                <Button variant="ghost" onClick={() => setStep('setup')}>Back</Button>
              )}
              <Button
                className="gap-2"
                style={{ background: '#E8945A', color: '#fff' }}
                disabled={saving || checkedCount === 0}
                onClick={handleCreateAndMove}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? 'Moving…' : `Move ${checkedCount} listing${checkedCount === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}