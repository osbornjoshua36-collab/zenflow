import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '$29', priceNote: '/mo' },
  { id: 'pro', name: 'Pro', price: '$69', priceNote: '/mo' },
  { id: 'business', name: 'Business', price: '$129', priceNote: '/mo' },
];

const RECOMMENDATIONS = { leads: 'pro', profile: 'starter', operations: 'business' };

const SUBHEADINGS = {
  leads: "You said you want leads fast. Pro members are notified first when matching jobs are posted.",
  profile: "You said you already have a backend. Starter gets your profile live and in front of buyers.",
  operations: "You said you want to run everything here. Business gives you the full toolkit from day one.",
};

const BULLETS = {
  leads: {
    starter: ['Listed in search results', 'Unlimited quote responses', 'Basic analytics'],
    pro: ['Wave 1 notifications — among the first 3 alerted on new jobs', '1.15x match score boost', 'Full analytics dashboard'],
    business: ['Wave 1 notifications + 1.25x match score boost', 'Invoicing and scheduling included', 'Priority support'],
  },
  profile: {
    starter: ['Professional storefront with custom URL', 'Unlimited listings', 'Verified badge eligibility'],
    pro: ['Everything in Starter', 'Wave 1 lead notifications when ready', 'Full analytics'],
    business: ['Everything in Pro', 'Invoicing, scheduling, and CRM included', 'Highest match score multiplier'],
  },
  operations: {
    starter: ['Storefront and listings', 'Invoicing basics', 'Lead access'],
    pro: ['Wave 1 lead notifications', 'Full invoicing and scheduling', 'Analytics dashboard'],
    business: ['Wave 1 + highest match multiplier', 'Complete business toolkit', 'Invoicing, CRM, calendar, hiring', 'Priority support'],
  },
};

const WHAT_THIS_MEANS = {
  leads: {
    starter: 'Gets you listed and visible to buyers looking for your services.',
    pro: "You'll be among the first 3 sellers notified when a matching job is posted.",
    business: 'Maximum visibility and the full toolset to convert and deliver jobs.',
  },
  profile: {
    starter: 'Everything you need to have a professional online presence buyers can find.',
    pro: "When you're ready to receive leads directly, Wave 1 access is already included.",
    business: 'Full platform — activate backend tools whenever you are ready to transition.',
  },
  operations: {
    starter: 'Basic platform access to get started.',
    pro: 'Lead access and core tools to manage your operations.',
    business: 'The full platform — one place to manage every part of your business.',
  },
};

export default function PlanScreen({ intent, onSelect, onSkip, onBack }) {
  const recommended = RECOMMENDATIONS[intent] || 'pro';
  const [selected, setSelected] = useState(recommended);
  const [showPayPerContact, setShowPayPerContact] = useState(false);
  const [saving, setSaving] = useState(false);

  const bullets = BULLETS[intent] || BULLETS.leads;
  const meanings = WHAT_THIS_MEANS[intent] || WHAT_THIS_MEANS.leads;

  const handleStart = async () => {
    setSaving(true);
    await onSelect(selected);
  };

  const selectedPlan = PLANS.find(p => p.id === selected);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-5xl mb-4">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
      </div>

      <div className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Choose how you want to start
        </h1>
        <p className="text-slate-500 text-base">{SUBHEADINGS[intent]}</p>
        <p className="text-sm text-green-600 font-medium mt-2">All plans include a 14-day free trial — no credit card needed</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {PLANS.map(plan => {
          const isRec = plan.id === recommended;
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all flex flex-col ${isSelected ? 'border-[#E8945A] bg-orange-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              {isRec && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8945A] text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Recommended for you
                </span>
              )}
              {isSelected && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-[#E8945A]" />}
              <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-0.5 mb-4">
                <span className="text-2xl font-bold text-slate-800">{plan.price}</span>
                <span className="text-sm text-slate-400">{plan.priceNote}</span>
              </div>
              <ul className="space-y-2 mb-4 flex-1">
                {(bullets[plan.id] || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-[#E8945A] mt-0.5 shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-3">{meanings[plan.id]}</p>
            </button>
          );
        })}
      </div>

      <Button onClick={handleStart} disabled={saving} className="px-10 py-3 text-base mb-4" style={{ background: '#E8945A', color: '#fff' }}>
        {saving ? 'Starting trial…' : `Start 14-day free trial on ${selectedPlan?.name}`}
      </Button>

      {/* Pay per contact option */}
      <div className="w-full max-w-5xl">
        <button onClick={() => setShowPayPerContact(v => !v)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mx-auto">
          I'd prefer to pay per lead as I need them — no monthly commitment {showPayPerContact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPayPerContact && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 leading-relaxed">
            <p className="font-medium text-slate-700 mb-2">Pay-per-contact credits</p>
            <ul className="space-y-1.5 mb-3 text-slate-500">
              <li>Credits are purchased in bundles and spent when you respond to individual leads</li>
              <li>Pay-per-contact sellers receive <strong>Wave 2 notifications at earliest</strong> — after subscribed sellers have already been notified</li>
              <li>No monthly commitment — top up credits when you need them</li>
            </ul>
            <p className="text-xs text-slate-400">You can switch to pay-per-contact from your billing settings at any time after going live.</p>
          </div>
        )}
      </div>

      <button onClick={onSkip} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
        I'll decide later
      </button>
    </div>
  );
}