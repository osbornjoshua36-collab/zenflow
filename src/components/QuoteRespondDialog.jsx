import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QuoteRespondDialog({ open, onClose, onSaved, quote }) {
  const [form, setForm] = useState({ seller_price: '', seller_timeline: '', seller_notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRespond = async () => {
    if (!form.seller_price) return;
    setLoading(true);
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.Quote.update(quote.id, {
      status: 'Quoted',
      seller_price: parseFloat(form.seller_price),
      seller_timeline: form.seller_timeline,
      seller_notes: form.seller_notes,
      expiry_date: expiry,
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  const handleDecline = async () => {
    setLoading(true);
    await base44.entities.Quote.update(quote.id, { status: 'Declined' });
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Respond to Quote Request</DialogTitle></DialogHeader>
        <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3">
          <p className="font-medium text-slate-800">{quote?.buyer_name}</p>
          <p className="text-slate-600 mt-1">{quote?.service_description}</p>
          {quote?.budget_range && <p className="text-slate-500 text-xs mt-1">Budget: {quote.budget_range}</p>}
        </div>
        <div className="space-y-3">
          <div>
            <Label>Your Price ($)*</Label>
            <Input type="number" placeholder="0.00" value={form.seller_price} onChange={e => set('seller_price', e.target.value)} />
          </div>
          <div>
            <Label>Timeline / Availability</Label>
            <Input placeholder="e.g. Available this weekend, 2–3 hrs" value={form.seller_timeline} onChange={e => set('seller_timeline', e.target.value)} />
          </div>
          <div>
            <Label>Notes for Buyer</Label>
            <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Any questions or details..."
              value={form.seller_notes} onChange={e => set('seller_notes', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={handleDecline} disabled={loading}>Decline</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleRespond} disabled={loading || !form.seller_price}>
              {loading ? 'Sending...' : 'Send Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}