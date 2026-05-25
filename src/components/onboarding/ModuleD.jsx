import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const PRICING_MODELS = [
  { id: 'fixed', label: 'Fixed', description: 'One price — same for every job' },
  { id: 'hourly', label: 'Hourly', description: 'Per hour — rate multiplied by hours worked' },
  { id: 'starting_from', label: 'Starting from', description: 'From a minimum — final cost depends on the job' },
  { id: 'contact_for_quote', label: 'Contact for quote', description: 'No price shown — buyers request a quote from you' },
];

const PRICE_LABELS = { fixed: 'Price', hourly: 'Hourly rate', starting_from: 'Starting from' };

const SERVICE_CATEGORIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Cleaning', 'Landscaping', 'Painting', 'Roofing',
  'Carpentry', 'Flooring', 'Appliance Repair', 'Pest Control', 'Pool Service',
  'Salon & Beauty', 'Real Estate', 'Photography', 'IT & Tech Support', 'Moving', 'Other'
];

export default function ModuleD({ seller, onComplete, onSellerUpdate }) {
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    pricing_model: '',
    price_amount: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const showPrice = form.pricing_model && form.pricing_model !== 'contact_for_quote';

  const validate = () => {
    const errs = {};
    if (!form.category) errs.category = 'Required';
    if (!form.title.trim()) errs.title = 'Required';
    if (form.description.length < 40) errs.description = 'At least 40 characters required';
    if (!form.pricing_model) errs.pricing_model = 'Required';
    if (showPrice && !form.price_amount) errs.price_amount = 'Required';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const listing = {
      business_id: seller.id,
      title: form.title,
      description: form.description,
      category: form.category,
      price_type: form.pricing_model === 'hourly' ? 'Hourly' : form.pricing_model === 'contact_for_quote' ? 'Contact for Quote' : 'Hourly',
      price: showPrice ? parseFloat(form.price_amount) || 0 : 0,
      status: 'Active',
      location: `${seller.business_city || ''}, ${seller.business_state || ''}`.trim().replace(/^,\s*/, ''),
      city: seller.business_city,
      state: seller.business_state,
      zip_code: seller.business_zip,
    };
    await base44.entities.Listing.create(listing);
    await onComplete({});
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>First service listing</h2>
        <p className="text-sm text-slate-500">Create one listing to get started. You can add more from your dashboard.</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">What type of service do you offer? *</Label>
        <select
          value={form.category}
          onChange={e => set('category', e.target.value)}
          className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select a category…</option>
          {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-slate-700">Service name *</Label>
          <span className="text-xs text-slate-400">{form.title.length} / 80</span>
        </div>
        <Input value={form.title} onChange={e => set('title', e.target.value)} maxLength={80} placeholder="e.g. AC installation and tune-up" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-slate-700">Describe this service *</Label>
          <span className={`text-xs ${form.description.length < 40 && form.description.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{form.description.length} / 400</span>
        </div>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} maxLength={400} rows={4} className="resize-none" placeholder="What's included, what to expect, any requirements…" />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">Pricing model *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRICING_MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => { set('pricing_model', m.id); if (m.id === 'contact_for_quote') set('price_amount', ''); }}
              className={`text-left p-3 rounded-xl border-2 transition-all ${form.pricing_model === m.id ? 'border-[#E8945A] bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
            >
              <p className="text-sm font-medium text-slate-800">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
            </button>
          ))}
        </div>
        {errors.pricing_model && <p className="text-xs text-red-500 mt-1">{errors.pricing_model}</p>}
      </div>

      {showPrice && (
        <div>
          <Label className="text-sm font-medium text-slate-700">{PRICE_LABELS[form.pricing_model]} *</Label>
          <div className="relative mt-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input type="number" min={0} step="0.01" value={form.price_amount} onChange={e => set('price_amount', e.target.value)} className="pl-7" placeholder="0.00" />
          </div>
          {errors.price_amount && <p className="text-xs text-red-500 mt-1">{errors.price_amount}</p>}
        </div>
      )}

      <p className="text-xs text-slate-400">You can add more services, set packages, and customise pricing from your dashboard after going live.</p>

      <Button onClick={handleSave} disabled={saving} className="w-full" style={{ background: '#E8945A', color: '#fff' }}>
        {saving ? 'Creating listing…' : 'Save and continue →'}
      </Button>
    </div>
  );
}