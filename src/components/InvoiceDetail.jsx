import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, RotateCcw } from 'lucide-react';

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
  const [transaction, setTransaction] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [showRefund, setShowRefund] = useState(false);

  useEffect(() => {
    if (invoice.status === 'Paid') {
      base44.entities.Transaction.filter({ invoice_id: invoice.id }).then(txns => {
        if (txns.length > 0) setTransaction(txns[0]);
      });
    }
  }, [invoice.id, invoice.status]);

  const handleRefund = async () => {
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0 || amt > invoice.amount) return;
    setRefunding(true);
    if (transaction) {
      await base44.entities.Transaction.update(transaction.id, {
        status: amt >= invoice.amount ? 'refunded' : 'partially_refunded',
        refund_amount: amt,
        refunded_at: new Date().toISOString(),
        refund_reason: 'Seller-initiated refund',
      });
    }
    await base44.entities.Invoice.update(invoice.id, { status: 'Cancelled' });
    if (invoice.customer_id) {
      await base44.entities.Notification.create({
        business_id: invoice.business_id,
        message: `Refund of $${amt.toFixed(2)} issued for invoice ${invoice.invoice_number}.`,
        type: 'system',
        related_entity_id: invoice.id,
      });
    }
    setRefunding(false);
    setShowRefund(false);
    await onUpdated();
    onBack();
  };

  const paidDaysAgo = invoice.paid_date
    ? Math.floor((Date.now() - new Date(invoice.paid_date).getTime()) / 86400000)
    : 999;
  const canRefund = invoice.status === 'Paid' && paidDaysAgo <= 30;
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
          {canRefund && !showRefund && (
            <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setRefundAmount(String(invoice.amount)); setShowRefund(true); }}>
              <RotateCcw className="w-4 h-4" /> Issue Refund
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

        {/* Transaction breakdown (Paid invoices) */}
        {transaction && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Payment Breakdown</p>
            <div className="flex justify-between">
              <span className="text-slate-600">Gross amount</span>
              <span className="font-medium text-slate-900">${transaction.gross_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Platform fee ({transaction.commission_rate}%)</span>
              <span className="text-red-600">−${transaction.commission_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-semibold text-slate-800">Your net payout</span>
              <span className="font-bold text-green-700">${transaction.net_amount?.toFixed(2)}</span>
            </div>
            {transaction.payout_hold_until && new Date(transaction.payout_hold_until) > new Date() && (
              <p className="text-xs text-amber-600 mt-1">Payout releases after {new Date(transaction.payout_hold_until).toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Refund UI */}
        {showRefund && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Issue a refund</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">$</span>
              <input
                type="number"
                min="0.01"
                max={invoice.amount}
                step="0.01"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className="w-32 h-8 px-2 rounded border border-red-200 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <span className="text-xs text-slate-400">max ${invoice.amount?.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={refunding} onClick={handleRefund}>
                {refunding ? 'Processing…' : 'Confirm refund'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRefund(false)}>Cancel</Button>
            </div>
          </div>
        )}

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