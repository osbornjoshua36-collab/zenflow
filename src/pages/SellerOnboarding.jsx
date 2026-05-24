import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ChevronRight, ChevronLeft, Building2, Image, Phone, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Business Profile', icon: Building2 },
  { id: 2, label: 'Logo',            icon: Image },
  { id: 3, label: 'Contact & Verify', icon: Phone },
];

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
const TONES = ['Professional', 'Friendly', 'Casual', 'Formal'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu', 'America/Anchorage',
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [existingBiz, setExistingBiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: '',
    industry: '',
    timezone: 'America/New_York',
    ai_tone: 'Professional',
    logo_url: '',
    phone: '',
    owner_email: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      set('owner_email', me.email);
      const existing = await base44.entities.Business.filter({ owner_email: me.email });
      if (existing.length > 0) {
        const biz = existing[0];
        setExistingBiz(biz);
        setForm({
          name: biz.name || '',
          industry: biz.industry || '',
          timezone: biz.timezone || 'America/New_York',
          ai_tone: biz.ai_tone || 'Professional',
          logo_url: biz.logo_url || '',
          phone: biz.phone || '',
          owner_email: biz.owner_email || me.email,
        });
      }
    })();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploading(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      industry: form.industry,
      timezone: form.timezone,
      ai_tone: form.ai_tone,
      logo_url: form.logo_url || undefined,
      phone: form.phone || undefined,
      owner_email: form.owner_email,
      status: 'Active',
    };
    if (existingBiz) {
      await base44.entities.Business.update(existingBiz.id, payload);
    } else {
      await base44.entities.Business.create(payload);
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => navigate('/seller/listings'), 1800);
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim() && form.industry && form.timezone;
    if (step === 2) return true; // logo optional
    if (step === 3) return form.owner_email.trim();
    return true;
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFCFF' }}>
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h2>
          <p className="text-slate-500">Taking you to your listings dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#FAFCFF' }}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Set Up Your Seller Account
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Just a few quick steps to get you listed.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const isComplete = step > s.id;
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete ? 'bg-green-500 text-white' :
                      isActive   ? 'text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                    style={isActive ? { background: '#1E3245' } : {}}
                  >
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-16 h-0.5 mx-1 mb-4 ${step > s.id ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          {/* STEP 1 — Business Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-800">Tell us about your business</h2>

              <div>
                <Label className="text-sm font-medium text-slate-700">Business Name *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Smith's Plumbing Co."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Industry *</Label>
                <Select value={form.industry} onValueChange={v => set('industry', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select your industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Your Timezone *</Label>
                <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('America/', '').replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">AI Response Tone</Label>
                <Select value={form.ai_tone} onValueChange={v => set('ai_tone', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">Sets the tone for AI-drafted messages to customers.</p>
              </div>
            </div>
          )}

          {/* STEP 2 — Logo */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-800">Add your business logo</h2>
              <p className="text-sm text-slate-500">A logo makes your profile stand out. You can skip this and add it later.</p>

              <div className="flex flex-col items-center gap-5 py-4">
                {/* Preview */}
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <div className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition ${
                    uploading ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    {uploading ? 'Uploading…' : form.logo_url ? 'Change Logo' : 'Upload Logo'}
                  </div>
                </label>

                {form.logo_url && (
                  <button
                    onClick={() => set('logo_url', '')}
                    className="text-xs text-slate-400 hover:text-red-500 transition"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Contact & Verify */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-800">Confirm your contact details</h2>

              <div>
                <Label className="text-sm font-medium text-slate-700">Business Email *</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.owner_email}
                  onChange={e => set('owner_email', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Used for customer inquiry notifications.</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Business Phone <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  className="mt-1"
                  type="tel"
                  placeholder="e.g. (555) 123-4567"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Used internally for identity verification — not shown publicly.</p>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                <p className="font-medium text-slate-700 mb-1">Review your profile</p>
                <div className="flex gap-2">
                  {form.logo_url && <img src={form.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover" />}
                  <div>
                    <p className="font-semibold text-slate-800">{form.name}</p>
                    <p className="text-slate-500">{form.industry} · {form.timezone.replace('America/', '')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>

            {step < STEPS.length ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="gap-1"
                style={{ background: '#1E3245', color: '#fff' }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canProceed() || saving}
                style={{ background: '#E8945A', color: '#fff' }}
                className="gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Finish Setup <CheckCircle className="w-4 h-4" /></>}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can update everything later from <span className="font-medium">Seller Settings</span>.
        </p>
      </div>
    </div>
  );
}