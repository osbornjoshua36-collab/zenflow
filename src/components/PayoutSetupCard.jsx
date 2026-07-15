import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const STATUS_INFO = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2, spin: false },
  pending: { label: 'In progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Loader2, spin: true },
  restricted: { label: 'Action needed', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle, spin: false },
  not_started: { label: 'Not set up', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Wallet, spin: false },
};

export default function PayoutSetupCard() {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const biz = await base44.entities.Business.filter({ owner_email: me.email });
      if (biz.length > 0) {
        setRecord(biz[0]);
        setLoading(false);
        return;
      }
      const profiles = await base44.entities.BuyerProfile.filter({ email: me.email });
      setRecord(profiles[0] || null);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const status = record?.stripe_connect_status || 'not_started';
  const info = STATUS_INFO[status] || STATUS_INFO.not_started;
  const Icon = info.icon;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('stripe-connect-onboard', {});
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      // No URL means already active — just refresh.
      await loadData();
    } catch (e) {
      console.error('Payout onboarding failed:', e);
    }
    setConnecting(false);
  };

  if (loading) return null;

  const copy =
    status === 'active'
      ? 'Your Stripe account is connected — you can receive payouts from your sales.'
      : status === 'restricted'
      ? 'Stripe needs more information to finish your payout account. Complete setup to keep receiving payouts.'
      : status === 'pending'
      ? 'Verification is in progress — check back shortly, or finish any remaining steps.'
      : 'Connect a Stripe account so you can receive payouts from your sales and services.';

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${info.bg}`}>
      <div className="flex items-start gap-3 flex-1">
        <Icon className={`w-6 h-6 ${info.color} ${info.spin ? 'animate-spin' : ''} shrink-0`} />
        <div>
          <h3 className="font-semibold text-slate-900">Payout account</h3>
          <p className="text-sm text-slate-600">{copy}</p>
          <p className="text-xs mt-1 text-slate-400">Status: {info.label}</p>
        </div>
      </div>
      {status !== 'active' && (
        <Button onClick={handleConnect} disabled={connecting} style={{ background: '#E8945A', color: '#fff' }}>
          {connecting ? 'Redirecting…' : status === 'not_started' ? 'Connect your payout account' : 'Finish setup'}
        </Button>
      )}
    </div>
  );
}