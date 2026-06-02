import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CANCEL_REASONS = [
  'Customer request',
  'Business unavailable',
  'Duplicate booking',
  'Weather',
  'Other',
];

export default function JobStatusModals({ job, modal, onClose, onConfirm }) {
  const [actualCost, setActualCost] = useState(job.actual_cost?.toString() || '');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOther, setCancelOther] = useState('');
  const [skipPhotosWarning, setSkipPhotosWarning] = useState(false);

  if (modal === 'start') {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark job as started?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will notify the customer that work has begun on{' '}
            <strong>"{job.title}"</strong>.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => onConfirm('start', {})}
            >
              Confirm — Mark as Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (modal === 'complete') {
    const hasAfterPhotos = (job.photos_after || []).length > 0;

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark job as completed?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Final job cost <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  className="pl-7"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {!hasAfterPhotos && !skipPhotosWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                You haven't added after photos yet.{' '}
                <button className="underline font-medium" onClick={onClose}>
                  Add them now
                </button>{' '}
                or{' '}
                <button className="underline" onClick={() => setSkipPhotosWarning(true)}>
                  continue without them
                </button>
                .
              </div>
            )}

            {(hasAfterPhotos || skipPhotosWarning) && (
              <>
                {!hasAfterPhotos && (
                  <p className="text-xs text-amber-600">Completing without after photos.</p>
                )}
                <p className="text-sm text-slate-600">
                  The customer will be notified. The invoice will be ready to send.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!actualCost}
                    onClick={() =>
                      onConfirm('complete', { actual_cost: parseFloat(actualCost) })
                    }
                  >
                    Mark as Completed
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (modal === 'cancel') {
    const finalReason =
      cancelReason === 'Other' ? cancelOther : cancelReason;

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this job?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
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
            </div>
            {cancelReason === 'Other' && (
              <Input
                placeholder="Please specify…"
                value={cancelOther}
                onChange={(e) => setCancelOther(e.target.value)}
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Keep job
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason || (cancelReason === 'Other' && !cancelOther)}
                onClick={() => onConfirm('cancel', { cancellation_reason: finalReason })}
              >
                Cancel job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (modal === 'no-show') {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as no-show?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will be recorded against the booking. The customer will be notified to reschedule.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => onConfirm('no-show', {})}>
              Mark as No-Show
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}