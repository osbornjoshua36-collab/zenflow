import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Phone } from 'lucide-react';

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
const AI_TONES = ['Professional', 'Friendly', 'Casual', 'Formal'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu', 'America/Anchorage',
];

export default function SellerSettings() {
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phoneSavedOnce, setPhoneSavedOnce] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const results = await base44.entities.Business.filter({ owner_email: user.email });
      const biz = results[0] || null;
      setBusiness(biz);
      if (biz) {
        setForm({
          name: biz.name || '',
          industry: biz.industry || '',
          phone: biz.phone || '',
          ai_tone: biz.ai_tone || 'Professional',
          owner_email: biz.owner_email || user.email,
          timezone: biz.timezone || 'America/New_York',
          logo_url: biz.logo_url || '',
          status: biz.status || 'Active',
        });
        if (biz.phone) setPhoneSavedOnce(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const hadPhone = !!business?.phone;
    const nowHasPhone = !!form.phone?.trim();

    if (business) {
      await base44.entities.Business.update(business.id, form);
      setBusiness({ ...business, ...form });
    } else {
      const created = await base44.entities.Business.create(form);
      setBusiness(created);
    }

    if (!hadPhone && nowHasPhone) setPhoneSavedOnce(true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Business Name *</label>
            <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. ABC Plumbing" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Industry *</label>
            <Select value={form.industry} onValueChange={v => set('industry', v)}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Owner Email *</label>
            <Input value={form.owner_email || ''} onChange={e => set('owner_email', e.target.value)} type="email" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Timezone *</label>
            <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
              <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
              <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Logo URL <span className="text-slate-400 font-normal">(optional)</span></label>
            <Input value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
          </div>



        </CardContent>
      </Card>

      {/* Phone verification section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-500" />
            Phone Number
            {business?.phone_verified && (
              <span className="text-xs font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Phone verified
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Phone number{' '}
              <span className="text-slate-400 font-normal">(optional, recommended)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Used for identity verification — not shown publicly. Helps build buyer trust.
            </p>
            <Input
              value={form.phone || ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          </div>
          {phoneSavedOnce && !business?.phone_verified && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Phone verification coming soon</strong> — once verified, a badge will appear on your public profile, helping build buyer trust.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !form.name || !form.industry}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}