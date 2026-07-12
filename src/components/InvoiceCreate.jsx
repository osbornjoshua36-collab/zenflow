import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';

function genInvoiceNumber(count) {
  const year = new Date().getFullYear();
  const n = String(count + 1).padStart(3, '0');
  return `INV-${year}-${n}`;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function InvoiceCreate({ business, customers = [], invoiceCount, onCreated, onCancel }) {
  const [form, setForm] = useState({
    customer_id: '',
    invoice_number: genInvoiceNumber(invoiceCount),
    due_date: defaultDueDate(),
    status: 'Draft',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([{ desc: '', amount: '' }]);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const total = lineItems.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const updateLine = (i, field, val) => setLineItems(lines => lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  const addLine = () => setLineItems(l => [...l, { desc: '', amount: '' }]);
  const removeLine = (i) => setLineItems(l => l.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.customer_id || !form.invoice_number) return;
    setSaving(true);
    await base44.entities.Invoice.create({
      business_id: business?.id || '',
      customer_id: form.customer_id,
      invoice_number: form.invoice_number,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      amount: total,
      status: form.status,
      description: JSON.stringify(lineItems.filter(l => l.desc || l.amount)),
      notes: form.notes,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>New Invoice</h2>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        {/* Customer */}
        <div>
          <Label>Customer *</Label>
          <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice # and Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number *</Label>
            <Input className="mt-1" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input className="mt-1" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <Label className="mb-2 block">Line Items</Label>
          <div className="space-y-2">
            {lineItems.map((line, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  className="flex-1"
                  placeholder="Description"
                  value={line.desc}
                  onChange={e => updateLine(i, 'desc', e.target.value)}
                />
                <Input
                  className="w-28"
                  type="number"
                  placeholder="Amount"
                  value={line.amount}
                  onChange={e => updateLine(i, 'amount', e.target.value)}
                />
                {lineItems.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-xl font-bold text-slate-900">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Notes */}
        <div>
          <Label>Notes (optional)</Label>
          <textarea
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Payment terms, thank you note, etc."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        {/* Status */}
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Save as Draft</SelectItem>
              <SelectItem value="Sent">Send Immediately</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          disabled={saving || !form.customer_id || !form.invoice_number}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save Invoice'}
        </Button>
      </div>
    </div>
  );
}