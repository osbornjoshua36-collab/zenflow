import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

export default function QuoteRequestDialog({ open, onClose, listing, business }) {
  const [form, setForm] = useState({ buyer_name: '', buyer_email: '', buyer_phone: '', service_description: '', location: '', preferred_date: '', budget_range: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.buyer_name || !form.buyer_email || !form.service_description) return;
    setLoading(true);
    await base44.entities.Quote.create({
      listing_id: listing.id,
      business_id: listing.business_id,
      ...form,
      status: 'Pending',
    });
    setLoading(false);
    setDone(true);
  };

  const handleClose = () => {
    setDone(false);
    setForm({ buyer_name: '', buyer_email: '', buyer_phone: '', service_description: '', location: '', preferred_date: '', budget_range: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? 'Request Sent!' : `Request a Quote`}</DialogTitle>
          {!done && <DialogDescription>{listing?.title} · {business?.name}</DialogDescription>}
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="text-slate-700 font-medium">Your quote request has been sent to {business?.name}.</p>
            <p className="text-sm text-slate-500">They'll review your request and respond with pricing and availability.</p>
            <Button onClick={handleClose} className="w-full mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your Name*</Label>
                <Input placeholder="Full name" value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="(555) 000-0000" value={form.buyer_phone} onChange={e => set('buyer_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email*</Label>
              <Input type="email" placeholder="you@email.com" value={form.buyer_email} onChange={e => set('buyer_email', e.target.value)} />
            </div>
            <div>
              <Label>Describe what you need*</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Tell this business what you need done..."
                value={form.service_description}
                onChange={e => set('service_description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your Location</Label>
                <Input placeholder="City or zip code" value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
              <div>
                <Label>Budget Range</Label>
                <Input placeholder="e.g. $200–$500" value={form.budget_range} onChange={e => set('budget_range', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Preferred Date</Label>
              <Input type="date" value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending...' : 'Send Quote Request'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}