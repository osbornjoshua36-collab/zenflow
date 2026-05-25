import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function ModuleA({ seller, onComplete, onSkip, skipLabel, isRequired, onSellerUpdate }) {
  const [form, setForm] = useState({
    tagline: seller?.tagline || '',
    business_description: seller?.business_description || '',
    years_in_business: seller?.years_in_business ?? '',
    number_of_employees: seller?.number_of_employees ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); onSellerUpdate({ [k]: v }); };

  const descLen = form.business_description.length;
  const descMin = isRequired ? 50 : 0;
  const descOk = descLen >= descMin;
  const canSave = !isRequired || descOk;

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      tagline: form.tagline,
      business_description: form.business_description,
      years_in_business: form.years_in_business !== '' ? parseInt(form.years_in_business) : null,
      number_of_employees: form.number_of_employees !== '' ? parseInt(form.number_of_employees) : null,
    };
    await base44.entities.Business.update(seller.id, updates);
    await onComplete(updates);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Business story</h2>
        <p className="text-sm text-slate-500">Tell buyers who you are and what makes you different.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-slate-700">Your headline</Label>
          <span className="text-xs text-slate-400">{form.tagline.length} / 120</span>
        </div>
        <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} maxLength={120} placeholder="e.g. Raleigh's most trusted HVAC team" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-slate-700">About your business {isRequired && '*'}</Label>
          <span className={`text-xs ${descLen < descMin ? 'text-amber-500' : 'text-slate-400'}`}>{form.business_description.length} / 1000</span>
        </div>
        <Textarea
          value={form.business_description}
          onChange={e => set('business_description', e.target.value)}
          maxLength={1000}
          rows={6}
          placeholder="Describe your experience, what you specialise in, and what makes you different."
          className="resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">Buyers read this before requesting a quote.</p>
        {isRequired && !descOk && form.business_description.length > 0 && (
          <p className="text-xs text-amber-600 mt-1">Add a bit more — at least {descMin} characters helps buyers understand your business. ({descMin - descLen} more needed)</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Years in business</Label>
          <Input type="number" min={0} max={99} value={form.years_in_business} onChange={e => set('years_in_business', e.target.value)} className="mt-1" placeholder="e.g. 8" />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Team size (including yourself)</Label>
          <Input type="number" min={1} max={9999} value={form.number_of_employees} onChange={e => set('number_of_employees', e.target.value)} className="mt-1" placeholder="e.g. 4" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>
        )}
        <Button onClick={handleSave} disabled={!canSave || saving} className="flex-1" style={{ background: '#E8945A', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save and continue →'}
        </Button>
      </div>
      {isRequired && !canSave && (
        <p className="text-xs text-slate-400 text-center">Add a bit more — at least {descMin} characters helps buyers understand your business.</p>
      )}
    </div>
  );
}