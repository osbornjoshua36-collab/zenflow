import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRO_PLAN_ID = 'pro_monthly';
const BUSINESS_PLAN_ID = 'business_monthly';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    features: ['Up to 2 active listings', 'Community Hub visibility', 'Basic scheduling'],
    excluded: ['AI message drafting', 'Invoicing module', 'Hiring module'],
  },
  {
    id: 'pro',
    plan_id: PRO_PLAN_ID,
    name: 'Pro',
    price: '$49/mo',
    features: [
      'Up to 10 active listings',
      'AI message drafting in Leads',
      'Full invoicing module',
      'Reputation management',
      'Advanced scheduling',
    ],
  },
  {
    id: 'business',
    plan_id: BUSINESS_PLAN_ID,
    name: 'Business',
    price: '$99/mo',
    features: [
      'Unlimited listings',
      'Everything in Pro',
      'Hiring module',
      'Priority verified badge review',
    ],
  },
];

const STATUS_BADGE = {
  active:   'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-800',
  canceled: 'bg-slate-100 text-slate-500',
};

export default function SellerSubscription() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { setLoading(false); return; }
        const biz = await base44.entities.Business.filter({ owner_email: me.email });
        setBusiness(biz[0] || null);
      } catch {
        // not authenticated
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpgrade = async (planId) => {
    setUpgrading(planId);
    const res = await base44.functions.invoke('createCheckout', {
      checkout_type: 'subscription',
      subscription_plan_id: planId,
      business_id: business.id,
    });
    if (res.data?.redirectUrl) {
      window.location.href = res.data.redirectUrl;
    }
    setUpgrading(null);
  };

  const handleCancel = async () => {
    setCanceling(true);
    await base44.entities.Business.update(business.id, {
      subscription_status: 'canceled',
      subscription_plan: 'starter',
    });
    setBusiness(prev => ({ ...prev, subscription_status: 'canceled', subscription_plan: 'starter' }));
    setCanceling(false);
    setShowCancel(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  const currentPlan = business?.subscription_plan || 'starter';
  const subStatus = business?.subscription_status || 'active';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Subscription Plans
        </h2>
        <p className="text-sm text-slate-500 mt-1">Choose the plan that fits your business.</p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className="bg-white rounded-xl p-6 flex flex-col relative"
              style={{ border: isCurrent ? '2px solid #E8945A' : '1px solid hsl(var(--border))' }}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-terracotta text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Your current plan
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ fontFamily: 'var(--font-fraunces)', color: isCurrent ? '#E8945A' : undefined }}
                >
                  {plan.price}
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.excluded?.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                    <XCircle className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button disabled className="w-full bg-slate-100 text-slate-400 cursor-not-allowed">
                  Current plan
                </Button>
              ) : plan.plan_id ? (
                <Button
                  className="w-full bg-navy hover:bg-navy-light text-white"
                  onClick={() => handleUpgrade(plan.plan_id)}
                  disabled={!!upgrading}
                >
                  {upgrading === plan.plan_id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Current subscription status */}
      {business && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Current Subscription</h3>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700 capitalize">{currentPlan} plan</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[subStatus] || 'bg-slate-100 text-slate-500'}`}>
              {subStatus.replace('_', ' ')}
            </span>
            {business.subscription_end_date && (
              <span className="text-xs text-slate-400">
                {subStatus === 'canceled' ? 'Reverts to Starter on' : 'Next billing:'}{' '}
                {new Date(business.subscription_end_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {subStatus === 'past_due' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Your last payment failed — please update your payment method to avoid losing access.
            </div>
          )}

          {subStatus === 'canceled' && (
            <p className="text-sm text-slate-500">
              Your plan has been canceled and will revert to Starter
              {business.subscription_end_date
                ? ` on ${new Date(business.subscription_end_date).toLocaleDateString()}`
                : ''}.
            </p>
          )}

          {(currentPlan === 'pro' || currentPlan === 'business') && subStatus !== 'canceled' && (
            !showCancel ? (
              <button
                onClick={() => setShowCancel(true)}
                className="text-sm text-slate-400 hover:text-red-500 underline transition-colors"
              >
                Cancel subscription
              </button>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-800">Are you sure you want to cancel?</p>
                <p className="text-xs text-slate-500">
                  You'll lose access to {currentPlan === 'business' ? 'Business' : 'Pro'} features at the end of your billing period.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleCancel}
                    disabled={canceling}
                  >
                    {canceling ? 'Canceling…' : 'Yes, cancel'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCancel(false)}>
                    Keep subscription
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}