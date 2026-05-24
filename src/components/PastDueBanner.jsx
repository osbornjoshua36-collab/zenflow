import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function PastDueBanner({ status }) {
  if (status !== 'past_due') return null;
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>Your subscription payment is overdue — some features may be restricted.</span>
      <Link to="/seller/subscription" className="ml-auto text-amber-700 font-semibold underline whitespace-nowrap">
        Update payment →
      </Link>
    </div>
  );
}