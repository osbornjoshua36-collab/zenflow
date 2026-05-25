export const STAGE_CONFIG = {
  draft:            { label: 'Draft',            color: 'bg-blue-100 text-blue-700 border-blue-200' },
  awaiting_quotes:  { label: 'Awaiting quotes',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  quote_received:   { label: 'Quote received',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  booked:           { label: 'Booked',            color: 'bg-teal-100 text-teal-700 border-teal-200' },
  in_progress:      { label: 'In progress',       color: 'bg-orange-100 text-orange-700 border-orange-200' },
  complete:         { label: 'Complete',          color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled:        { label: 'Cancelled',         color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export function deriveStage(quote, job) {
  if (job) {
    if (job.status === 'Completed') return 'complete';
    if (job.status === 'In Progress') return 'in_progress';
    if (job.status === 'Cancelled') return 'cancelled';
    return 'booked';
  }
  if (!quote) return 'draft';
  if (quote.status === 'Declined' || quote.status === 'Expired') return 'cancelled';
  if (quote.status === 'Accepted' || quote.status === 'Converted') return 'booked';
  if (quote.status === 'Quoted') return 'quote_received';
  if (quote.status === 'Draft') return 'draft';
  return 'awaiting_quotes'; // Pending
}

export default function BuyerJobStatusBadge({ stage }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}