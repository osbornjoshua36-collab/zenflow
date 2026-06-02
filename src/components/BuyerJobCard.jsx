import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Star, ChevronRight, RotateCcw, Calendar } from 'lucide-react';
import BuyerJobStatusBadge, { deriveStage } from '@/components/BuyerJobStatusBadge';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const CANCEL_REASONS = [
  'Changed my mind',
  'Found another provider',
  'Schedule conflict',
  'Other',
];

const fmtDate = (d) =>
  new Date(d).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function PrimaryAction({ stage, quote, job, invoice, review, onPayInvoice, paying }) {
  switch (stage) {
    case 'draft':
      return (
        <Link to="/community">
          <Button size="sm" variant="outline">Complete your request</Button>
        </Link>
      );
    case 'awaiting_quotes':
      return (
        <Link to="/community">
          <Button size="sm" variant="outline">View request</Button>
        </Link>
      );
    case 'quote_received':
      return (
        <Link to="/community">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">Review quotes</Button>
        </Link>
      );
    case 'booked':
      return (
        <Link to="/buyer/dashboard">
          <Button size="sm" variant="outline">View booking <ChevronRight className="w-3 h-3" /></Button>
        </Link>
      );
    case 'in_progress':
      return invoice && invoice.status !== 'Paid' ? (
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
          onClick={onPayInvoice}
          disabled={paying}
        >
          <CreditCard className="w-3 h-3" />
          {paying ? 'Redirecting…' : `Pay $${invoice.amount}`}
        </Button>
      ) : (
        <Button size="sm" variant="outline">View job</Button>
      );
    case 'complete':
      if (!review) {
        return (
          <Link to={`/post-job?job_id=${job?.id}`}>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <Star className="w-3 h-3" /> Leave a review
            </Button>
          </Link>
        );
      }
      return (
        <Link to="/community">
          <Button size="sm" variant="outline" className="gap-1">
            <RotateCcw className="w-3 h-3" /> Book again
          </Button>
        </Link>
      );
    default:
      return null;
  }
}

export default function BuyerJobCard({ quote, job, businesses, invoice, review, onPayInvoice, paying }) {
  const { toast } = useToast();
  const stage = deriveStage(quote, job);
  const title = job?.title || quote?.service_description || 'Service request';
  const businessId = job?.business_id || quote?.business_id;
  const sellerName = businesses[businessId]?.name;
  const price = job ? null : quote?.seller_price;
  const updatedAt = job?.updated_date || quote?.updated_date || quote?.created_date;

  // Buyer cancel/reschedule state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reschedDates, setReschedDates] = useState(['', '', '']);
  const [reschedNote, setReschedNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const needsAttention =
    ['quote_received', 'in_progress'].includes(stage) ||
    (stage === 'booked' && job?.scheduling_status === 'proposed') ||
    (stage === 'complete' && !review) ||
    (invoice && invoice.status !== 'Paid');

  // Task 4: Confirm a proposed time slot
  const handleConfirmSlot = async (slot) => {
    if (!job) return;
    setActionLoading(true);
    await base44.entities.Job.update(job.id, {
      confirmed_date: slot,
      scheduled_date: slot,
      scheduling_status: 'confirmed',
    });
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: `A customer has confirmed their appointment for ${fmtDate(slot)} for "${job.title}".`,
      type: 'job_update',
      related_entity_id: job.id,
    });
    toast({
      title: 'Appointment confirmed!',
      description: `Confirmed for ${fmtDate(slot)}.`,
    });
    setActionLoading(false);
  };

  // Task 7: Buyer cancel
  const handleBuyerCancel = async () => {
    if (!job || !cancelReason) return;
    setActionLoading(true);
    await base44.entities.Job.update(job.id, {
      status: 'Cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancelReason,
      cancelled_by: 'buyer',
    });
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: `A customer has cancelled their "${job.title}" booking. Reason: ${cancelReason}.`,
      type: 'job_update',
      related_entity_id: job.id,
    });
    toast({ title: 'Booking cancelled.' });
    setShowCancelModal(false);
    setActionLoading(false);
  };

  // Task 7: Buyer reschedule request
  const handleBuyerReschedule = async () => {
    if (!job || !reschedDates[0]) return;
    setActionLoading(true);
    const proposed = reschedDates
      .filter(Boolean)
      .map((d) => new Date(d).toISOString());
    const dateList = proposed.map(fmtDate).join(', ');
    await base44.entities.Job.update(job.id, {
      scheduling_status: 'awaiting_proposal',
      proposed_dates: proposed,
    });
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: `A customer has requested a reschedule for "${job.title}". Preferred times: ${dateList}.`,
      type: 'job_update',
      related_entity_id: job.id,
    });
    toast({
      title: 'Reschedule request sent.',
      description: `${sellerName || 'The business'} will propose new times shortly.`,
    });
    setShowRescheduleModal(false);
    setActionLoading(false);
  };

  return (
    <>
      <div
        className={`bg-white border rounded-xl p-4 ${
          needsAttention ? 'border-l-4 border-l-terracotta' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <BuyerJobStatusBadge stage={stage} />
              {needsAttention && (
                <span className="text-xs text-terracotta font-medium">Action needed</span>
              )}
            </div>
            <p className="font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {sellerName || 'Awaiting responses'}
              {price != null && ` · $${price}`}
              {updatedAt && ` · ${new Date(updatedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="shrink-0">
            <PrimaryAction
              stage={stage}
              quote={quote}
              job={job}
              invoice={invoice}
              review={review}
              onPayInvoice={onPayInvoice}
              paying={paying}
            />
          </div>
        </div>

        {/* Task 4: Proposed time slots — clickable buttons */}
        {stage === 'booked' &&
          job?.scheduling_status === 'proposed' &&
          (job?.proposed_dates || []).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1 text-blue-500" />
                Choose a time to confirm your appointment:
              </p>
              <div className="space-y-2">
                {job.proposed_dates.map((d, i) => (
                  <button
                    key={i}
                    disabled={actionLoading}
                    onClick={() => handleConfirmSlot(d)}
                    className="w-full text-sm text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 font-medium text-blue-800"
                  >
                    {fmtDate(d)}
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Task 7: Reschedule / cancel links for confirmed bookings */}
        {stage === 'booked' && job?.scheduling_status === 'confirmed' && (
          <div className="mt-3 pt-3 border-t flex gap-4">
            <button
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
              onClick={() => setShowRescheduleModal(true)}
            >
              Request reschedule
            </button>
            <button
              className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel booking
            </button>
          </div>
        )}

        {/* Completed with review */}
        {stage === 'complete' && review && (
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i <= review.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-300'
                }`}
              />
            ))}
            <span className="text-xs text-slate-500 ml-1">You reviewed this job</span>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Keep booking
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason || actionLoading}
                onClick={handleBuyerCancel}
              >
                Cancel booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request reschedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter up to 3 preferred times. The business will review and send new options.
            </p>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <label className="text-xs text-slate-500 block mb-1">
                  {i === 0 ? 'Preferred time *' : `Option ${i + 1} (optional)`}
                </label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={reschedDates[i] || ''}
                  onChange={(e) => {
                    const d = [...reschedDates];
                    d[i] = e.target.value;
                    setReschedDates(d);
                  }}
                />
              </div>
            ))}
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Note to the business (optional, max 200 characters)"
              maxLength={200}
              rows={2}
              value={reschedNote}
              onChange={(e) => setReschedNote(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
                Cancel
              </Button>
              <Button disabled={!reschedDates[0] || actionLoading} onClick={handleBuyerReschedule}>
                Send request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}