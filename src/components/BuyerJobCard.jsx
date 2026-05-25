import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard, Star, ChevronRight, RotateCcw } from 'lucide-react';
import BuyerJobStatusBadge, { deriveStage } from '@/components/BuyerJobStatusBadge';

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
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={onPayInvoice} disabled={paying}>
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
  const stage = deriveStage(quote, job);
  const title = job?.title || quote?.service_description || 'Service request';
  const businessId = job?.business_id || quote?.business_id;
  const sellerName = businesses[businessId]?.name;
  const price = job ? null : quote?.seller_price;
  const updatedAt = job?.updated_date || quote?.updated_date || quote?.created_date;

  const needsAttention = ['quote_received', 'in_progress'].includes(stage) ||
    (stage === 'booked' && job?.scheduling_status === 'proposed') ||
    (stage === 'complete' && !review) ||
    (invoice && invoice.status !== 'Paid');

  return (
    <div className={`bg-white border rounded-xl p-4 ${needsAttention ? 'border-l-4 border-l-terracotta' : ''}`}>
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

      {/* Scheduling: proposed dates to confirm */}
      {stage === 'booked' && job?.scheduling_status === 'proposed' && job?.proposed_dates?.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm font-medium text-slate-700 mb-2">Seller proposed times — confirm one:</p>
          <div className="space-y-1.5">
            {job.proposed_dates.map((d, i) => (
              <div key={i} className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                {new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed with review */}
      {stage === 'complete' && review && (
        <div className="mt-2 flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-300'}`} />
          ))}
          <span className="text-xs text-slate-500 ml-1">You reviewed this job</span>
        </div>
      )}
    </div>
  );
}