import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Eye, MousePointer, CheckCircle } from 'lucide-react';
import PayoutSetupCard from '@/components/PayoutSetupCard';

const TIERS = [
  { value: 'Banner',   label: 'Banner',   price: '$49', monthly: 49, accentColor: '#E8945A', badge: 'Most Visible' },
  { value: 'Featured', label: 'Featured', price: '$29', monthly: 29, accentColor: '#7A6AAA', badge: 'Best Value' },
  { value: 'Spotlight',label: 'Spotlight',price: '$19', monthly: 19, accentColor: '#D4A03A', badge: 'Entry Tier' },
];

const STATUS_COLORS = {
  Active:           'bg-green-100 text-green-800',
  Paused:           'bg-amber-100 text-amber-800',
  'Pending Review': 'bg-purple-100 text-purple-800',
  'Pending Payment':'bg-orange-100 text-orange-800',
  Expired:          'bg-slate-100 text-slate-600',
  Draft:            'bg-slate-100 text-slate-600',
  cancelled:        'bg-red-100 text-red-700',
};

export default function SellerBilling() {
  const [ads, setAds] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    const [bizList, adsData] = await Promise.all([
      base44.entities.Business.list('-created_date', 1),
      base44.entities.Ad.list('-created_date', 200),
    ]);
    const biz = bizList[0] || null;
    setBusiness(biz);
    const myAds = biz ? adsData.filter(a => a.business_id === biz.id) : [];
    setAds(myAds);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const activeSub = ads.find(a => a.status === 'Active');

  const handleSwitchPlan = async (tier) => {
    if (!business) return;
    setSwitching(tier.value);
    const newAd = await base44.entities.Ad.create({
      business_id: business.id,
      headline: `${tier.label} Ad — ${business.name}`,
      tier: tier.value,
      status: 'Pending Payment',
      impressions: 0,
      clicks: 0,
    });
    const res = await base44.functions.invoke('create-checkout', {
      checkout_type: 'ad',
      tier: tier.value,
      business_id: business.id,
      headline: newAd.headline,
      ad_id: newAd.id,
    });
    if (res.data?.redirectUrl) {
      window.location.href = res.data.redirectUrl;
    } else {
      await base44.entities.Ad.delete(newAd.id);
      setSwitching(null);
      alert('Failed to initiate checkout. Please try again.');
    }
  };

  const handleCancelConfirm = async () => {
    if (!activeSub) return;
    setCancelling(true);
    await base44.entities.Ad.update(activeSub.id, { status: 'cancelled' });
    setCancelling(false);
    setShowCancel(false);
    loadData();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <PayoutSetupCard />

      {/* SECTION 1 — Current Plan */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>Current Plan</h2>
        {activeSub ? (
          <div className="bg-white rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>{activeSub.headline}</span>
                <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>
              </div>
              <p className="text-sm text-slate-500">Tier: <span className="font-medium text-slate-700">{activeSub.tier}</span></p>
              {activeSub.budget > 0 && (
                <p className="text-sm text-slate-500">Monthly budget: <span className="font-medium text-slate-700">${activeSub.budget}</span></p>
              )}
              {activeSub.end_date && (
                <p className="text-sm text-slate-500">Next billing: <span className="font-medium text-slate-700">{new Date(activeSub.end_date).toLocaleDateString()}</span></p>
              )}
            </div>
            <CreditCard className="w-8 h-8 text-slate-300 shrink-0" />
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
            No active plan — browse plans below.
          </div>
        )}
      </section>

      {/* SECTION 2 — Ad Campaigns */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>Ad Campaigns</h2>
        {ads.length === 0 ? (
          <p className="text-slate-500 text-sm">No ad campaigns yet.</p>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Headline</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3">Start Date</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad, i) => (
                  <tr key={ad.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{ad.headline}</td>
                    <td className="px-4 py-3 text-slate-600">{ad.tier}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ad.status] || 'bg-slate-100 text-slate-600'}`}>{ad.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      <span className="flex items-center justify-end gap-1"><Eye className="w-3.5 h-3.5" />{ad.impressions || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      <span className="flex items-center justify-end gap-1"><MousePointer className="w-3.5 h-3.5" />{ad.clicks || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3 — Upgrade / Change Plan */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-fraunces)' }}>Upgrade / Change Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map(tier => {
            const isCurrent = activeSub?.tier === tier.value;
            return (
              <div
                key={tier.value}
                className="rounded-xl border-2 p-5 flex flex-col gap-3 bg-white"
                style={{ borderColor: isCurrent ? tier.accentColor : '#E2E8F0' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: tier.accentColor }}>{tier.badge}</span>
                  {isCurrent && <span className="text-xs font-semibold text-green-700 flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> Current</span>}
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>{tier.label}</p>
                  <p className="text-2xl font-bold mt-0.5" style={{ color: tier.accentColor }}>{tier.price}<span className="text-sm font-normal text-slate-400"> / mo</span></p>
                </div>
                {isCurrent ? (
                  <div className="text-center text-sm text-slate-400 py-1">Your current plan</div>
                ) : (
                  <Button
                    className="w-full text-white"
                    style={{ background: tier.accentColor }}
                    disabled={!!switching}
                    onClick={() => handleSwitchPlan(tier)}
                  >
                    {switching === tier.value ? 'Redirecting…' : 'Switch to this plan'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 — Cancel */}
      {activeSub && (
        <section className="pb-4">
          <button
            onClick={() => setShowCancel(true)}
            className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
          >
            Cancel my subscription
          </button>
        </section>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-1">
            Are you sure you want to cancel? Your plan remains active until the end of the current billing period.
          </p>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Plan</Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={handleCancelConfirm}
            >
              {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}