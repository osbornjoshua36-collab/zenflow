import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const PAYMENT_TERMS_OPTIONS = ['Due on receipt', 'Net 7', 'Net 14', 'Net 30', 'Custom'];

export default function ModuleF({ seller, onComplete, onSkip, skipLabel }) {
  const [form, setForm] = useState({
    invoice_default_payment_terms: seller?.invoice_default_payment_terms || '',
    invoice_default_tax_rate_pct: seller?.invoice_default_tax_rate_pct ?? '',
    invoice_default_notes: seller?.invoice_default_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      invoice_default_payment_terms: form.invoice_default_payment_terms,
      invoice_default_tax_rate_pct: form.invoice_default_tax_rate_pct !== '' ? parseFloat(form.invoice_default_tax_rate_pct) : null,
      invoice_default_notes: form.invoice_default_notes,
    };
    await base44.entities.Business.update(seller.id, updates);
    await onComplete(updates);
  };

  const sampleNotes = form.invoice_default_notes || 'Thank you for your business.';
  const taxRate = form.invoice_default_tax_rate_pct || '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Invoicing setup</h2>
        <p className="text-sm text-slate-500">Set your defaults for all invoices. You can override these per invoice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium text-slate-700">Default payment terms</Label>
            <Select value={form.invoice_default_payment_terms} onValueChange={v => set('invoice_default_payment_terms', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select terms" /></SelectTrigger>
              <SelectContent>{PAYMENT_TERMS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Default tax rate (%)</Label>
            <Input className="mt-1 max-w-xs" type="number" min={0} max={100} step="0.01" value={form.invoice_default_tax_rate_pct} onChange={e => set('invoice_default_tax_rate_pct', e.target.value)} placeholder="e.g. 8.5" />
            <p className="text-xs text-slate-400 mt-1">You can override this on individual invoices.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-medium text-slate-700">Default invoice footer note</Label>
              <span className="text-xs text-slate-400">{form.invoice_default_notes.length} / 300</span>
            </div>
            <Textarea value={form.invoice_default_notes} onChange={e => set('invoice_default_notes', e.target.value)} maxLength={300} rows={3} className="resize-none" placeholder="e.g. Thank you for your business." />
            <p className="text-xs text-slate-400 mt-1">Shown at the bottom of every invoice.</p>
          </div>
        </div>

        {/* Sample invoice preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-3">
          <p className="text-sm font-semibold text-slate-700 border-b pb-2">Invoice preview</p>
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{seller?.business_name || 'Your Business'}</p>
              <p className="text-slate-400">Invoice #0001</p>
            </div>
            <div className="text-right text-slate-400">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Terms: {form.invoice_default_payment_terms || 'Not set'}</p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2 space-y-1">
            <div className="flex justify-between"><span>Service fee</span><span>$200.00</span></div>
            <div className="flex justify-between text-slate-400"><span>Tax ({taxRate}%)</span><span>${(200 * parseFloat(taxRate || 0) / 100).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>${(200 * (1 + parseFloat(taxRate || 0) / 100)).toFixed(2)}</span></div>
          </div>
          <p className="text-slate-400 border-t pt-2 italic">{sampleNotes}</p>
        </div>
      </div>

      {/* Payout section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-slate-700 mb-2">Where should we send your payments?</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-700 font-medium">Payout setup is coming soon</p>
          <p className="text-xs text-amber-600 mt-1">You'll be notified when it's available. For now you can still send invoices and collect payment directly with clients.</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onSkip && <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>}
        <Button onClick={handleSave} disabled={saving} className="flex-1" style={{ background: '#E8945A', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save and continue →'}
        </Button>
      </div>
    </div>
  );
}