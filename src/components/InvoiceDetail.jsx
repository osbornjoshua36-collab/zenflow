import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer } from 'lucide-react';

const STATUS_STYLES = {
  Draft:   'bg-slate-100 text-slate-600',
  Sent:    'bg-blue-100 text-blue-800',
  Viewed:  'bg-purple-100 text-purple-800',
  Paid:    'bg-green-100 text-green-800',
  Overdue: 'bg-red-100 text-red-800',
  Cancelled: 'bg-slate-100 text-slate-500',
};

function parseLineItems(description) {
  if (!description) return [];
  try { return JSON.parse(description); } catch { return []; }
}

export default function InvoiceDetail({ invoice, customers, onBack, onUpdated }) {
  const [marking, setMarking] = useState(false);
  const custMap = Object.fromEntries(customers.map(c => [c.id, c]));
  const customer = custMap[invoice.customer_id];
  const lineItems = parseLineItems(invoice.description);

  const handleMarkPaid = async () => {
    setMarking(true);
    await base44.entities.Invoice.update(invoice.id, { status: 'Paid', paid_date: new Date().toISOString() });
    await onUpdated();
    setMarking(false);
    onBack();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>Invoice {invoice.invoice_number}</h2>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_STYLES[invoice.status] || 'bg-slate-100 text-slate-600'}`}>{invoice.status}</span>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'Sent' && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={marking} onClick={handleMarkPaid}>
              {marking ? 'Updating…' : 'Mark as Paid'}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5 print:shadow-none">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Customer</p>
            <p className="font-semibold text-slate-900">{customer?.name || '—'}</p>
            {customer?.email && <p className="text-slate-500">{customer.email}</p>}
            {customer?.phone && <p className="text-slate-500">{customer.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Invoice Details</p>
            <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
            {invoice.due_date && <p className="text-slate-500">Due: {new Date(invoice.due_date).toLocaleDateString()}</p>}
            {invoice.paid_date && <p className="text-green-600 text-xs mt-0.5">Paid: {new Date(invoice.paid_date).toLocaleDateString()}</p>}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Line items */}
        {lineItems.length > 0 ? (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Line Items</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((l, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-slate-700">{l.desc || '—'}</td>
                    <td className="py-2 text-right text-slate-800">${(parseFloat(l.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : invoice.description ? (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700">{invoice.description}</p>
          </div>
        ) : null}

        {/* Total */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
          <span className="font-semibold text-slate-700">Total</span>
          <span className="text-2xl font-bold text-slate-900">${(invoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}