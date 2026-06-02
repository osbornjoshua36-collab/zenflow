import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, Mail, User, FileText, Star, Bell, ExternalLink } from 'lucide-react';

export default function JobRightPanel({ job, customer, invoice, quote, review, onCreateInvoice, onSendReminder }) {
  return (
    <div className="space-y-4">
      {/* Customer */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Customer
        </h3>
        {customer ? (
          <>
            <div>
              <p className="font-medium text-slate-900">{customer.name}</p>
              {customer.phone && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </p>
              )}
              {customer.email && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </p>
              )}
            </div>
            <Link to="/clients" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> View client record
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-400">No customer linked.</p>
        )}

        {/* Send reminder */}
        {['Scheduled', 'In Progress'].includes(job.status) && customer && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs"
            onClick={onSendReminder}
          >
            <Bell className="w-3.5 h-3.5" /> Send reminder
          </Button>
        )}
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Invoice
        </h3>
        {invoice ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">#{invoice.invoice_number}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  invoice.status === 'Paid'
                    ? 'bg-green-100 text-green-700'
                    : invoice.status === 'Overdue'
                    ? 'bg-red-100 text-red-700'
                    : invoice.status === 'Sent'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-1">${invoice.amount?.toFixed(2)}</p>
            <Link to="/finance" className="text-xs text-blue-600 hover:underline mt-1 block">
              View invoice →
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-2">No invoice yet</p>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={onCreateInvoice}>
              Create invoice
            </Button>
          </div>
        )}
      </div>

      {/* Related quote */}
      {quote && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Related Quote</h3>
          <p className="text-sm text-slate-600">{quote.service_description || 'Service quote'}</p>
          {quote.seller_price != null && (
            <p className="text-sm font-medium text-slate-900">
              Quoted: ${quote.seller_price}
            </p>
          )}
        </div>
      )}

      {/* Review */}
      {job.status === 'Completed' && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Star className="w-3.5 h-3.5" /> Review
          </h3>
          {review ? (
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i <= review.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-300'
                    }`}
                  />
                ))}
              </div>
              {review.text && (
                <p className="text-sm text-slate-600 mt-1 italic">"{review.text}"</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No review yet.</p>
          )}
        </div>
      )}
    </div>
  );
}