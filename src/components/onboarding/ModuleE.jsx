import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Upload, Loader2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function DocUpload({ label, value, onUpload, uploading, accept = 'PDF or image' }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {value ? (
        <div className="mt-1 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-xs text-green-700 flex-1 truncate">{value.split('/').pop() || 'Uploaded'}</span>
          <button onClick={() => onUpload(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
        </div>
      ) : (
        <label className="mt-1 flex items-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#E8945A] hover:bg-orange-50 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Upload className="w-4 h-4 text-slate-400" />}
          <span className="text-sm text-slate-500">Upload {accept}</span>
          <input type="file" className="hidden" accept={accept.includes('PDF') ? '.pdf,image/*' : 'image/*'} onChange={async e => {
            const f = e.target.files[0]; if (!f) return;
            const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
            onUpload(file_url);
          }} />
        </label>
      )}
    </div>
  );
}

function CollapsibleSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function ModuleE({ seller, onComplete, onSkip, skipLabel }) {
  const [licenceOpen, setLicenceOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [form, setForm] = useState({
    licence_number: seller?.licence_number || '',
    licence_type: seller?.licence_type || '',
    licence_expiry_date: seller?.licence_expiry_date || '',
    licence_document_url: seller?.licence_document_url || '',
    insurance_provider: seller?.insurance_provider || '',
    insurance_policy_number: seller?.insurance_policy_number || '',
    insurance_expiry_date: seller?.insurance_expiry_date || '',
    insurance_document_url: seller?.insurance_document_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    if (form.licence_number && !form.licence_document_url) errs.licence_doc = 'Please upload your licence document';
    if (form.insurance_provider && !form.insurance_document_url) errs.insurance_doc = 'Please upload your insurance certificate';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const hasDoc = form.licence_document_url || form.insurance_document_url;
    const updates = { ...form };
    if (hasDoc) {
      updates.verification_status = 'pending';
      // Notify admin
      base44.integrations.Core.SendEmail({
        to: 'admin@platform.com',
        subject: `New seller credentials submitted: ${seller.business_name || seller.name}`,
        body: `Seller ${seller.business_name || seller.name} (ID: ${seller.id}) has submitted credentials for verification. Review in admin panel.`
      }).catch(() => {});
    }
    await base44.entities.Business.update(seller.id, updates);
    await onComplete(updates);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Credentials</h2>
      </div>

      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">Sellers with verified credentials earn a <strong>Verified badge</strong> and rank higher in search results. You can submit documents now or from your dashboard at any time.</p>
      </div>

      <CollapsibleSection title="Contractor licence" expanded={licenceOpen} onToggle={() => setLicenceOpen(v => !v)}>
        <div>
          <Label className="text-sm font-medium text-slate-700">Licence number</Label>
          <Input className="mt-1" value={form.licence_number} onChange={e => set('licence_number', e.target.value)} maxLength={50} />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Licence type</Label>
          <Input className="mt-1" value={form.licence_type} onChange={e => set('licence_type', e.target.value)} maxLength={100} placeholder="e.g. NC General Contractor" />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Expiry date</Label>
          <Input className="mt-1 max-w-xs" type="date" value={form.licence_expiry_date} onChange={e => set('licence_expiry_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        <DocUpload
          label={`Upload licence ${form.licence_number ? '*' : '(optional)'}`}
          value={form.licence_document_url}
          onUpload={v => set('licence_document_url', v || '')}
          accept="PDF or image"
        />
        {errors.licence_doc && <p className="text-xs text-red-500">{errors.licence_doc}</p>}
      </CollapsibleSection>

      <CollapsibleSection title="Insurance" expanded={insuranceOpen} onToggle={() => setInsuranceOpen(v => !v)}>
        <div>
          <Label className="text-sm font-medium text-slate-700">Insurance provider</Label>
          <Input className="mt-1" value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Policy number</Label>
          <Input className="mt-1" value={form.insurance_policy_number} onChange={e => set('insurance_policy_number', e.target.value)} maxLength={50} />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Expiry date</Label>
          <Input className="mt-1 max-w-xs" type="date" value={form.insurance_expiry_date} onChange={e => set('insurance_expiry_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        <DocUpload
          label={`Upload certificate of insurance ${form.insurance_provider ? '*' : '(optional)'}`}
          value={form.insurance_document_url}
          onUpload={v => set('insurance_document_url', v || '')}
          accept="PDF"
        />
        {errors.insurance_doc && <p className="text-xs text-red-500">{errors.insurance_doc}</p>}
      </CollapsibleSection>

      <div className="flex gap-3 pt-2">
        {onSkip && <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>}
        <Button onClick={handleSave} disabled={saving} className="flex-1" style={{ background: '#E8945A', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save and continue →'}
        </Button>
      </div>
    </div>
  );
}