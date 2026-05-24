import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Zap, X } from 'lucide-react';

const TIERS = [
  { id: '7day',  label: '7 days',  price: '$15', desc: 'Appear at the top of search results for 7 days.' },
  { id: '30day', label: '30 days', price: '$39', desc: 'Maximum visibility for a full month.' },
];

export default function BoostListingDialog({ listing, onClose }) {
  const [tier, setTier] = useState('7day');
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('createCheckout', {
      checkout_type: 'boost',
      listing_id: listing.id,
      boost_tier: tier,
    });
    if (res.data?.redirectUrl) {
      window.location.href = res.data.redirectUrl;
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Boost this listing</h3>
            <p className="text-sm text-slate-500 mt-0.5">"{listing.title}"</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Appear at the top of search results in the Community Hub, above regular listings.
        </p>

        <div className="space-y-3">
          {TIERS.map(t => (
            <label key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${tier === t.id ? 'border-terracotta bg-terracotta/5' : 'border-slate-200 hover:border-slate-300'}`}>
              <input
                type="radio"
                name="boost_tier"
                value={t.id}
                checked={tier === t.id}
                onChange={() => setTier(t.id)}
                className="accent-terracotta"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{t.label}</span>
                  <span className="text-lg font-bold text-slate-900">{t.price}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            className="flex-1 gap-2 bg-terracotta hover:bg-terracotta-dark text-white"
            onClick={handleBoost}
            disabled={loading}
          >
            <Zap className="w-4 h-4" />
            {loading ? 'Redirecting…' : 'Boost now'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}