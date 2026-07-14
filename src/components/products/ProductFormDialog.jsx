import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload } from 'lucide-react';
import AiDraftFromPhoto from '@/components/products/AiDraftFromPhoto';

const CATEGORIES = ['Handmade & Crafts', 'Home Goods', 'Clothing & Accessories', 'Electronics', 'Collectibles', 'Other'];
const CONDITIONS = ['New', 'Used – Like New', 'Used – Good', 'Used – Fair'];

export default function ProductFormDialog({ open, onClose, onSaved, businessId, sellerEmail, existing }) {
  const empty = { title: '', description: '', category: '', price: '', quantity_available: 1, condition: 'New', images: [], fulfillment_method: 'Local Pickup', shipping_flat_rate: '', status: 'Draft' };
  const [form, setForm] = useState(existing || empty);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (files) => {
    const current = form.images || [];
    const slots = 8 - current.length;
    if (slots <= 0) return;
    setUploading(true);
    const toUpload = Array.from(files).slice(0, slots);
    const urls = [];
    for (const file of toUpload) {
      const res = await base44.integrations.Core.UploadFile({ file });
      urls.push(res.file_url);
    }
    set('images', [...current, ...urls]);
    setUploading(false);
  };

  const removeImage = (idx) => set('images', form.images.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.title || !form.category || !form.price) return;
    setLoading(true);
    const data = {
      ...form,
      price: parseFloat(form.price) || 0,
      quantity_available: parseInt(form.quantity_available) || 1,
      shipping_flat_rate: form.shipping_flat_rate ? parseFloat(form.shipping_flat_rate) : null,
      ...(businessId ? { business_id: businessId } : {}),
      ...(sellerEmail ? { seller_email: sellerEmail } : {}),
    };
    if (existing?.id) {
      await base44.entities.Product.update(existing.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    setLoading(false);
    setForm(empty);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Handmade ceramic mug" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={v => set('condition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($) *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="24.99" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity_available} onChange={e => set('quantity_available', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Fulfillment</Label>
            <Select value={form.fulfillment_method} onValueChange={v => set('fulfillment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Local Pickup">Local Pickup</SelectItem>
                <SelectItem value="Shipping">Shipping</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.fulfillment_method === 'Shipping' || form.fulfillment_method === 'Both') && (
            <div>
              <Label>Flat Shipping Rate ($)</Label>
              <Input type="number" step="0.01" value={form.shipping_flat_rate} onChange={e => set('shipping_flat_rate', e.target.value)} placeholder="5.99" />
            </div>
          )}
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Images ({form.images?.length || 0}/8)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.images?.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={url} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {form.images?.length < 8 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400">
                  {uploading ? <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Upload className="w-5 h-5 text-slate-400" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                </label>
              )}
            </div>
          </div>
          <AiDraftFromPhoto
            imageUrl={form.images?.[0]}
            businessId={businessId}
            sellerEmail={sellerEmail}
            onApply={(d) => setForm(f => ({
              ...f,
              title: d.title || f.title,
              description: d.description || f.description,
              category: d.category || f.category,
            }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}