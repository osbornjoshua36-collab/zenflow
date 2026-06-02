import { Button } from '@/components/ui/button';
import { Play, CheckCircle, Plus, RotateCcw, RefreshCw, FileText } from 'lucide-react';

export default function JobFooterActions({ job, invoice, onAction }) {
  const { status } = job;

  return (
    <div className="sticky bottom-0 bg-white border-t shadow-md px-4 py-3 flex items-center justify-end gap-3 -mx-4 sm:-mx-6 mt-8 rounded-none">
      {status === 'Scheduled' && (
        <>
          <Button variant="outline" className="gap-1.5" onClick={() => onAction('reschedule')}>
            <RotateCcw className="w-4 h-4" /> Reschedule
          </Button>
          <Button
            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => onAction('start')}
          >
            <Play className="w-4 h-4" /> Mark as Started
          </Button>
        </>
      )}

      {status === 'In Progress' && (
        <>
          <Button variant="outline" className="gap-1.5" onClick={() => onAction('add_photos')}>
            Add photos
          </Button>
          <Button
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAction('complete')}
          >
            <CheckCircle className="w-4 h-4" /> Mark as Completed
          </Button>
        </>
      )}

      {status === 'Completed' && (
        <>
          {!invoice && (
            <Button className="gap-1.5" onClick={() => onAction('create_invoice')}>
              <Plus className="w-4 h-4" /> Create invoice
            </Button>
          )}
          {invoice && (
            <Button variant="outline" className="gap-1.5" onClick={() => onAction('view_invoice')}>
              <FileText className="w-4 h-4" /> View invoice
            </Button>
          )}
        </>
      )}

      {status === 'Cancelled' && (
        <Button className="gap-1.5" onClick={() => onAction('reactivate')}>
          <RefreshCw className="w-4 h-4" /> Reactivate job
        </Button>
      )}

      {status === 'No-Show' && (
        <Button className="gap-1.5 bg-slate-700 hover:bg-slate-800 text-white" onClick={() => onAction('reschedule')}>
          <RotateCcw className="w-4 h-4" /> Reschedule
        </Button>
      )}
    </div>
  );
}