import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const SUBHEADINGS = {
  leads: "You said you want leads fast. Priority Access members are notified ahead of General Access sellers when matching jobs are posted.",
  profile: "You said you already have a backend. General Access gets your profile live and in front of buyers.",
  operations: "You said you want to run everything here. All-Access gives you every tool from day one — nothing is locked.",
};

const STARTER_BULLETS = [
  "Professional profile page with your own web address — works as your business website",
  "Create and publish service listings with your own pricing",
  "Receive and respond to job enquiries from buyers in your area",
  "Send invoices and collect payment from clients",
  "Collect verified reviews from paying customers",
];

const PRO_BULLETS = [
  "Everything in Starter",
  "Earlier lead alerts — notified ahead of General Access members when a matching job is posted near you",
  "Job scheduling calendar — manage bookings, send reminders, track job status",
  "Performance dashboard — see profile views, quote requests, and conversion to jobs",
  "Sync with Google Calendar or Outlook to avoid double-bookings",
];

const BUSINESS_BULLETS = [
  "Everything in Starter and Pro",
  "Priority placement — shown to buyers above General Access and Priority Access members in search results",
  "Full invoicing — line items, tax, discounts, recurring billing, and payment tracking",
  "Job scheduling and calendar sync — replaces standalone scheduling tools",
  "Client records with full job history, notes, and automatic re-booking reminders",
  "Expense tracking and annual income and tax summary — exportable as CSV",
  "Post job openings and manage applicants directly on the platform",
];

// Card order: Starter (left), Business (centre, recommended), Pro (right)
const PLANS = [
  {
    id: 'starter',
    name: 'General Access',
    price: 19,
    priceDisplay: '$19',
    buttonLabel: 'Join as Founding General Access',
    tagline: "Your business is live, visible, and open for work. Everything you need to start receiving job enquiries.",
    bullets: STARTER_BULLETS,
    recommended: false,
    savingsLine: "You save $10/mo — locked permanently",
    footnote: null,
  },
  {
    id: 'business',
    name: 'All-Access',
    price: 79,
    priceDisplay: '$79',
    buttonLabel: 'Join as Founding All-Access',
    tagline: "First notification on every matching job. Every tool. Nothing locked. One platform for your entire operation.",
    bullets: BUSINESS_BULLETS,
    recommended: true,
    savingsLine: "You save $120/mo — locked permanently",
    footnote: "Includes priority support and dedicated onboarding assistance.",
  },
  {
    id: 'pro',
    name: 'Priority Access',
    price: 49,
    priceDisplay: '$49',
    buttonLabel: 'Join as Founding Priority Access',
    tagline: "Get ahead of General Access members on every matching job. Plus the scheduling and analytics tools to run your operation.",
    bullets: PRO_BULLETS,
    recommended: false,
    savingsLine: "You save $50/mo — locked permanently",
    footnote: null,
  },
];

export default function PlanScreen({ intent, onSelect, onSkip, onBack }) {
  const [selected, setSelected] = useState('business');
  const [showPayPerContact, setShowPayPerContact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPlan, setSavingPlan] = useState(null);

  const handleStart = async (planId) => {
    setSaving(true);
    setSavingPlan(planId);
    await onSelect(planId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-5xl mb-4">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
      </div>

      <div className="w-full max-w-5xl text-center mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
          Choose how you want to start
        </h1>
        <p className="text-slate-500 text-base">{SUBHEADINGS[intent] || SUBHEADINGS.leads}</p>
      </div>

      {/* Founding member callout banner */}
      <div className="w-full max-w-5xl mb-6">
        <div
          className="rounded-xl px-5 py-3.5"
          style={{
            background: '#FFFBEB',
            border: '0.5px solid #E5E7EB',
          }}
        >
          <div className="flex flex-wrap items-start gap-2">
            <span
              className="shrink-0 mt-0.5"
              style={{
                background: '#DCFCE7',
                color: '#166534',
                fontSize: '11px',
                fontWeight: 500,
                padding: '2px 10px',
                borderRadius: '99px',
                whiteSpace: 'nowrap',
              }}
            >
              Founding member pricing
            </span>
            <div>
              <p style={{ fontSize: '13px', color: '#111827', lineHeight: 1.5 }}>
                Join before we reach 200 active business accounts and these prices are locked in for you permanently — no increases, ever. New business accounts after that pay our standard rates.
              </p>
              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                What new business accounts pay after founding period closes: General Access $29 · Priority Access $99 · All-Access $199
              </p>
            </div>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-success)', textAlign: 'center', marginBottom: '24px' }}>
        ● 30-day trial on all plans — enter your card today, first payment on day 30. Cancel any time before then at no charge.
      </p>

      {/* Plan cards — order: Starter, Business (recommended), Pro */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
        {PLANS.map(plan => {
          const isSelected = selected === plan.id;
          return (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all flex flex-col cursor-pointer ${
                plan.recommended
                  ? isSelected
                    ? 'border-[#E8945A] bg-orange-50 shadow-md'
                    : 'border-[#E8945A] bg-white shadow-sm'
                  : isSelected
                    ? 'border-[#E8945A] bg-orange-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8945A] text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  Recommended for you
                </span>
              )}
              {isSelected && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-[#E8945A]" />}

              <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>

              {/* Price */}
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-2xl font-bold text-slate-800">{plan.priceDisplay}</span>
                {plan.price !== null && (
                  <span className="text-sm text-slate-400">/mo</span>
                )}
              </div>

              {/* Savings comparison line (Business only) */}
              {plan.savingsLine && (
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#166534', marginBottom: '12px' }}>
                  {plan.savingsLine}
                </p>
              )}

              {!plan.savingsLine && <div className="mb-4" />}

              {/* Bullets */}
              <ul className="space-y-2 mb-4 flex-1">
                {plan.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-[#E8945A] mt-0.5 shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              {/* Tagline */}
              <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-3 mb-3">{plan.tagline}</p>

              {/* Per-card CTA button */}
              <Button
                onClick={e => { e.stopPropagation(); handleStart(plan.id); }}
                disabled={saving}
                className="w-full"
                style={{ background: '#E8945A', color: '#fff' }}
              >
                {saving && savingPlan === plan.id ? 'Setting up…' : plan.buttonLabel}
              </Button>

              {/* Footnote (Business only) */}
              {plan.footnote && (
                <p className="text-xs text-slate-400 text-center mt-2">{plan.footnote}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Transaction fee waiver */}
      <p style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center', padding: '10px 0' }}>
        We take 0% on jobs you complete through the platform during our launch period.
      </p>

      {/* Pay-per-contact text link */}
      <div className="w-full max-w-5xl text-center mb-4">
        <button
          onClick={() => setShowPayPerContact(v => !v)}
          style={{
            fontSize: '12px',
            color: '#6B7280',
            textDecoration: 'underline',
            textDecorationColor: '#D1D5DB',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Prefer to pay per lead as you go — no monthly commitment →
        </button>
        {showPayPerContact && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-600 leading-relaxed text-left">
            <p className="font-medium text-slate-700 mb-2">Pay-per-contact credits</p>
            <p className="text-sm text-slate-500 mb-3">
              Buy credits and spend one credit to respond to each lead that interests you. No monthly fee. Credits do not expire.
            </p>
            <ul className="space-y-1.5 mb-3 text-slate-500">
              <li>✓ 10 credits — $19</li>
              <li>✓ 25 credits — $39</li>
              <li>✓ 50 credits — $69</li>
            </ul>
            <p className="text-xs text-slate-400">Pay-per-contact members receive lead notifications after subscribed members. You can switch plans from your billing settings at any time.</p>
          </div>
        )}
      </div>

      <button onClick={onSkip} className="mt-2 text-sm text-slate-400 hover:text-slate-600">
        I'll decide later
      </button>
    </div>
  );
}