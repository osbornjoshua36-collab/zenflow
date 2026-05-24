import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';

const REASONS = [
  'Spam',
  'Scam or fraud',
  'Illegal service',
  'Misleading price',
  'Inappropriate content',
  'Wrong category',
];

export default function ReportDialog({ open, onClose, targetType, targetId, targetLabel }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setReason('');
    setDetails('');
    setEmail('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await base44.entities.Report.create({
      reporter_email: email || null,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details || null,
      status: 'open',
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Report {targetType === 'seller' ? 'Seller' : 'Listing'}
            {targetLabel ? `: ${targetLabel}` : ''}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold text-slate-800">Thank you for your report</p>
            <p className="text-sm text-slate-500">We've received your report and will review it.</p>
            <Button className="mt-2 w-full" onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Why are you reporting this {targetType === 'seller' ? 'seller' : 'listing'}? *
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Additional details <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Any extra context..."
                maxLength={300}
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
              <p className="text-xs text-slate-400 text-right">{details.length}/300</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Your email <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                disabled={!reason || submitting}
                onClick={handleSubmit}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}