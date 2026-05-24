import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function BuyerRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ display_name: '', zip_code: '', agreed: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
      setForm(f => ({ ...f, display_name: me.full_name || '' }));

      // If they already have a BuyerProfile, skip to community
      const existing = await base44.entities.BuyerProfile.filter({ user_id: me.id });
      if (existing.length > 0) navigate('/community');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreed) { setError('Please agree to the community guidelines.'); return; }
    if (!form.display_name.trim()) { setError('Full name is required.'); return; }
    setError('');
    setSaving(true);
    await base44.entities.BuyerProfile.create({
      user_id: user.id,
      display_name: form.display_name.trim(),
      email: user.email,
      zip_code: form.zip_code.trim() || undefined,
    });
    navigate('/community');
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFCFF' }}>
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAFCFF' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Join as a Buyer
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Find trusted local service providers near you.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <Label htmlFor="display_name" className="text-sm font-medium text-slate-700">Full Name *</Label>
              <Input
                id="display_name"
                className="mt-1"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Jane Smith"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                className="mt-1 bg-slate-50 text-slate-500"
                value={user.email}
                disabled
              />
              <p className="text-xs text-slate-400 mt-1">From your account — cannot be changed here.</p>
            </div>

            <div>
              <Label htmlFor="zip_code" className="text-sm font-medium text-slate-700">
                Zip Code <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="zip_code"
                className="mt-1"
                value={form.zip_code}
                onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))}
                placeholder="e.g. 10001"
                maxLength={10}
              />
              <p className="text-xs text-slate-400 mt-1">Helps us show local services near you.</p>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="agreed"
                checked={form.agreed}
                onCheckedChange={v => setForm(f => ({ ...f, agreed: !!v }))}
                className="mt-0.5"
              />
              <Label htmlFor="agreed" className="text-sm text-slate-600 leading-snug cursor-pointer">
                I agree to the{' '}
                <span className="text-blue-600 underline cursor-pointer">community guidelines</span>
              </Label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Creating your account…' : 'Create Buyer Account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Registering as a business?{' '}
          <Link to="/seller/settings" className="text-blue-600 hover:underline font-medium">
            Set up a seller account →
          </Link>
        </p>
      </div>
    </div>
  );
}