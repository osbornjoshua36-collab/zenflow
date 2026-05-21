import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BookingRequestDialog({ open, onClose, business, selectedDate, onBooked }) {
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', service_type: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.customer_name || !form.customer_phone || !selectedDate) return;
    setLoading(true);
    await base44.entities.BookingRequest.create({
      ...form,
      business_id: business.id,
      requested_date: selectedDate.toISOString(),
      status: 'Pending',
    });
    setLoading(false);
    setSuccess(true);
    onBooked && onBooked();
  };

  const handleClose = () => {
    setSuccess(false);
    setForm({ customer_name: '', customer_phone: '', customer_email: '', service_type: '', notes: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Booking — {business?.name}</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-slate-800">Booking Request Sent!</p>
            <p className="text-sm text-slate-500 mt-1">{business?.name} will reach out to confirm.</p>
            <Button className="mt-5" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="text-slate-500">Requested time:</p>
              <p className="font-medium text-slate-800">{selectedDate?.toLocaleString()}</p>
            </div>
            <div>
              <Label>Service Needed</Label>
              <Input placeholder="e.g. AC repair, pipe leak..." value={form.service_type} onChange={e => set('service_type', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your Name*</Label>
                <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
              </div>
              <div>
                <Label>Phone*</Label>
                <Input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input placeholder="Anything the business should know..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending...' : 'Send Booking Request'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}