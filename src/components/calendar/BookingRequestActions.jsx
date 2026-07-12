import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export default function BookingRequestActions({ bookingRequest, onClose, onSaved }) {
  const [loading, setLoading] = useState(null);

  if (!bookingRequest) return null;

  const handleConfirm = async () => {
    setLoading('confirm');
    try {
      await base44.asServiceRole.entities.BookingRequest.update(bookingRequest.id, { status: 'Confirmed' });
    } catch (e) {
      console.error('Failed to confirm booking request:', e);
    }
    setLoading(null);
    onSaved();
    onClose();
  };

  const handleDecline = async () => {
    setLoading('decline');
    try {
      await base44.asServiceRole.entities.BookingRequest.update(bookingRequest.id, { status: 'Declined' });
    } catch (e) {
      console.error('Failed to decline booking request:', e);
    }
    setLoading(null);
    onSaved();
    onClose();
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Dialog open={!!bookingRequest} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Booking Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="text-sm text-slate-600 space-y-1">
            <p><span className="font-medium text-slate-800">Customer:</span> {bookingRequest.customer_name}</p>
            <p><span className="font-medium text-slate-800">Service:</span> {bookingRequest.service_type || 'General'}</p>
            <p><span className="font-medium text-slate-800">Requested:</span> {fmtDate(bookingRequest.requested_date)}</p>
            {bookingRequest.customer_phone && <p><span className="font-medium text-slate-800">Phone:</span> {bookingRequest.customer_phone}</p>}
            {bookingRequest.customer_email && <p><span className="font-medium text-slate-800">Email:</span> {bookingRequest.customer_email}</p>}
            {bookingRequest.notes && <p><span className="font-medium text-slate-800">Notes:</span> {bookingRequest.notes}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirm} disabled={!!loading}>
              <Check className="w-4 h-4" /> {loading === 'confirm' ? 'Confirming...' : 'Confirm'}
            </Button>
            <Button variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={handleDecline} disabled={!!loading}>
              <X className="w-4 h-4" /> {loading === 'decline' ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}