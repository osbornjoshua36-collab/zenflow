import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const STATUS_STYLES = {
  Draft:   'bg-slate-100 text-slate-600',
  Sent:    'bg-blue-100 text-blue-800',
  Viewed:  'bg-purple-100 text-purple-800',
  Paid:    'bg-green-100 text-green-800',
  Overdue: 'bg-red-100 text-red-800',
  Cancelled: 'bg-slate-100 text-slate-500',
};

export default function InvoiceList({ invoices, customers, onView, onCreate, onUpdated }) {
  const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const outstanding = invoices.filter(i => ['Sent', 'Viewed', 'Overdue'].includes(i.status));
  const paidThisMonth = invoices.filter(i => i.status === 'Paid' && i.paid_date && new Date(i.paid_date) >= startOfMonth);
  const totalOutstanding = outstanding.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaidMonth = paidThisMonth.reduce((s, i) => s + (i.amount || 0), 0);

  const handleMarkPaid = async (inv, e) => {
    e.stopPropagation();
    await base44.entities.Invoice.update(inv.id, { status: 'Paid', paid_date: new Date().toISOString() });
    onUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 mb-0.5">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-0.5">{outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 mb-0.5">Paid This Month</p>
          <p className="text-2xl font-bold text-green-600">${totalPaidMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-0.5">{paidThisMonth.length} invoice{paidThisMonth.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>All Invoices</h2>
        <Button onClick={onCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create Invoice
        </Button>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
          No invoices yet. Create your first invoice above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} className={`border-b last:border-0 hover:bg-slate-50 cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`} onClick={() => onView(inv)}>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{custMap[inv.customer_id]?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">${(inv.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inv.status] || 'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => onView(inv)}>View</Button>
                      {inv.status === 'Sent' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={(e) => handleMarkPaid(inv, e)}>Mark Paid</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}