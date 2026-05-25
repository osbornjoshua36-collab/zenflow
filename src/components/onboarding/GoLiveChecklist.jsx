import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateProfileCompleteness } from '@/utils/sellerUtils';

const INTENT_CTAS = {
  leads: (plan) => `Go live on ${plan} — your first leads could arrive today`,
  profile: (plan) => `Publish my profile on ${plan}`,
  operations: (plan) => `Launch my workspace on ${plan}`,
};

const PLAN_LABELS = { starter: 'Starter', pro: 'Pro', business: 'Business', none: 'Free' };

function CircularProgress({ pct }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} className="-rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke="#E8945A" strokeWidth={8} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <p className="text-3xl font-bold text-slate-800 -mt-16">{pct}%</p>
      <p className="text-xs text-slate-500 mt-14 font-medium">{pct}% profile complete</p>
    </div>
  );
}

export default function GoLiveChecklist({ seller, onGoLive, onSellerUpdate }) {
  const [hasActiveListing, setHasActiveListing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goingLive, setGoingLive] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const listings = await base44.entities.Listing.filter({ business_id: seller.id, status: 'Active' });
        setHasActiveListing(listings.length > 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [seller.id]);

  const pct = calculateProfileCompleteness(seller, hasActiveListing);
  const trialPlan = seller.trial_plan_tier;
  const hasTrialOrPlan = trialPlan && trialPlan !== 'none';
  const planLabel = PLAN_LABELS[trialPlan] || 'Free';
  const intent = seller.onboarding_intent || 'leads';

  const trialDaysLeft = seller.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(seller.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const CRITERIA = [
    { label: 'Phone number verified', met: (seller.onboarding_step_completed || 0) >= 1, field: 'phone' },
    { label: 'Business name added', met: !!seller.business_name, field: 'name' },
    { label: 'Business description added', met: (seller.business_description || '').length >= 50, field: 'description' },
    { label: 'Logo uploaded', met: !!seller.logo_url, field: 'logo' },
    { label: 'At least one portfolio photo', met: (seller.portfolio_images || []).length >= 1, field: 'portfolio' },
    { label: 'Service area configured', met: !!seller.service_radius_miles, field: 'area' },
    { label: 'At least one active listing', met: hasActiveListing, field: 'listing' },
    { label: 'Credentials submitted', met: !!(seller.licence_document_url || seller.insurance_document_url), field: 'credentials' },
  ];

  const unmetRequired = CRITERIA.filter(c => !c.met);
  const canGoLive = pct >= 60;

  const handleGoLive = async () => {
    setGoingLive(true);
    await onGoLive();
  };

  const getGoLiveLabel = () => {
    if (!canGoLive) return `Complete ${unmetRequired.length} more item${unmetRequired.length !== 1 ? 's' : ''} to go live`;
    if (hasTrialOrPlan) return INTENT_CTAS[intent]?.(planLabel) || `Go live on ${planLabel}`;
    return 'Go live on the free tier (leads limited)';
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Ready to go live?</h2>
        <p className="text-sm text-slate-500">Review your profile and launch when you're ready.</p>
      </div>

      {/* Plan status row */}
      {hasTrialOrPlan ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{planLabel} trial active{trialDaysLeft !== null ? ` — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining` : ''}</p>
            <p className="text-xs text-green-600">Add a payment method to continue after your trial.</p>
          </div>
          <button className="text-xs text-green-600 hover:underline">Add payment →</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">No plan selected</p>
            <p className="text-xs text-amber-700">You'll receive leads in Wave 3 only, behind sellers on paid plans.</p>
          </div>
          <button className="text-xs text-amber-700 hover:underline font-medium">Choose a plan →</button>
        </div>
      )}

      {/* Completeness ring */}
      <div className="flex justify-center py-4">
        <CircularProgress pct={pct} />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {CRITERIA.map((c, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${c.met ? 'border-green-100 bg-green-50' : 'border-slate-100 bg-white'}`}>
            {c.met
              ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              : <Circle className="w-5 h-5 text-slate-300 shrink-0" />
            }
            <span className={`text-sm flex-1 ${c.met ? 'text-green-700' : 'text-slate-600'}`}>{c.label}</span>
            {!c.met && <button className="text-xs text-[#E8945A] hover:underline">Complete now →</button>}
          </div>
        ))}
      </div>

      {/* Go live button */}
      <div className="pt-2">
        {!canGoLive && (
          <div className="mb-3 space-y-1">
            <p className="text-sm text-slate-500 text-center">Complete {unmetRequired.length} more item{unmetRequired.length !== 1 ? 's' : ''} to go live:</p>
            {unmetRequired.map((c, i) => (
              <p key={i} className="text-xs text-center text-[#E8945A]">• {c.label}</p>
            ))}
          </div>
        )}

        <Button
          onClick={handleGoLive}
          disabled={!canGoLive || goingLive}
          className="w-full py-3 text-base font-semibold"
          variant={canGoLive && !hasTrialOrPlan ? 'outline' : 'default'}
          style={canGoLive && hasTrialOrPlan ? { background: '#E8945A', color: '#fff' } : {}}
        >
          {goingLive ? <><Loader2 className="w-4 h-4 animate-spin" /> Going live…</> : getGoLiveLabel()}
        </Button>

        {canGoLive && !hasTrialOrPlan && (
          <p className="text-xs text-amber-600 text-center mt-2">Sellers without a plan receive leads in Wave 3 only — after subscribed sellers have already been notified.</p>
        )}

        {/* Preview storefront */}
        {seller.slug && (
          <a href={`/seller/${seller.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-500 hover:text-slate-700">
            <ExternalLink className="w-3.5 h-3.5" /> Preview my storefront
          </a>
        )}
      </div>
    </div>
  );
}