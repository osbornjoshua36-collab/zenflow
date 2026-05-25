import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Loader2 } from 'lucide-react';

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
const TIMEZONES = [
  { id: 'America/New_York',    label: 'Eastern Time (ET)'  },
  { id: 'America/Chicago',     label: 'Central Time (CT)'  },
  { id: 'America/Denver',      label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)'  },
  { id: 'America/Phoenix',     label: 'Arizona (MST)'      },
  { id: 'Pacific/Honolulu',    label: 'Hawaii (HST)'       },
  { id: 'America/Anchorage',   label: 'Alaska (AKST)'      },
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', industry: '', timezone: 'America/New_York', owner_email: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [existingBiz, setExistingBiz] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      set('owner_email', me.email);
      const existing = await base44.entities.Business.filter({ owner_email: me.email });
      if (existing.length > 0) {
        const biz = existing[0];
        setExistingBiz(biz);
        setForm({ name: biz.name || '', industry: biz.industry || '', timezone: biz.timezone || 'America/New_York', owner_email: me.email });
      }
    })();
  }, []);

  const canSubmit = form.name.trim() && form.industry && form.timezone && confirmed;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const payload = { name: form.name, industry: form.industry, timezone: form.timezone, owner_email: form.owner_email, status: 'Active', ai_tone: 'Professional' };
    if (existingBiz) {
      await base44.entities.Business.update(existingBiz.id, payload);
    } else {
      await base44.entities.Business.create(payload);
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => navigate('/seller/listings'), 1800);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFCFF]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h2>
          <p className="text-slate-500">Taking you to your listings dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Create Your Seller Account
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Quick setup — you'll be live in under a minute.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-5">
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
                {TIMEZONES.map(tz => <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="human"
              checked={confirmed}
              onCheckedChange={setConfirmed}
              className="mt-0.5"
            />
            <label htmlFor="human" className="text-sm text-slate-600 cursor-pointer leading-snug">
              I confirm I am a real person and a legitimate service provider.
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="w-full mt-2 gap-2"
            style={{ background: '#E8945A', color: '#fff' }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <>Get Started <CheckCircle className="w-4 h-4" /></>}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can add more details anytime from <span className="font-medium">Seller Settings</span>.
        </p>
      </div>
    </div>
  );
}