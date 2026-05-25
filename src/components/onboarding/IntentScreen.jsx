import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const CARDS = [
  {
    id: 'leads',
    badge: 'Get leads fast',
    badgeColor: 'bg-green-100 text-green-700',
    title: 'I want to start getting job requests as quickly as possible',
    description: "You're new to the platform and your priority is getting in front of buyers. Everything else can come later.",
    whoThis: "You're just starting out, recently went independent, or want to test the platform before committing to more.",
    whatNext: ['Listing and service area set up first', 'Profile built around getting found', 'Brand and credentials at your own pace'],
    upsell: 'Once leads are flowing, scheduling and invoicing tools are ready when you need them.',
  },
  {
    id: 'profile',
    badge: 'Build my presence',
    badgeColor: 'bg-blue-100 text-blue-700',
    title: 'I already run my business — I just need clients to find me online',
    description: "You have your own systems for scheduling, invoicing, and client management. What you need is a professional front end that works as your online presence.",
    whoThis: "You use Jobber, QuickBooks, Google Calendar, or your own setup already and you don't want to change that right now.",
    whatNext: ['Storefront and brand assets set up first', 'Listings and verification prioritised', 'Backend tools available when ready'],
    upsell: "When your current tools start to feel fragmented or expensive, the platform's built-in backend is ready to switch on — no migration needed.",
  },
  {
    id: 'operations',
    badge: 'Run everything here',
    badgeColor: 'bg-purple-100 text-purple-700',
    title: 'I want one place for leads, scheduling, invoicing, and clients',
    description: "You want to consolidate your tools and run your whole business from a single platform — from the first lead to the final invoice.",
    whoThis: "You're juggling multiple apps and want to simplify, or you're building a new operation and want the right foundation from day one.",
    whatNext: ['Invoicing and calendar set up early', 'Profile and listings built in parallel', 'Full toolkit active from go-live'],
    upsell: 'As your team grows, advanced analytics, hiring tools, and multi-user access unlock the full platform.',
  },
];

export default function IntentScreen({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    await onSelect(selected);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-5xl mb-4">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
      </div>

      <div className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
          What best describes your situation?
        </h1>
        <p className="text-slate-500 text-lg">We'll set up your account in the order that works best for you.</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {CARDS.map(card => {
          const isSelected = selected === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setSelected(card.id)}
              className={`relative text-left rounded-2xl border-2 p-6 transition-all flex flex-col ${isSelected ? 'border-[#E8945A] bg-orange-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
            >
              {isSelected && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-[#E8945A]" />}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mb-4 self-start ${card.badgeColor}`}>{card.badge}</span>
              <h3 className="text-base font-semibold text-slate-800 mb-3 leading-snug">{card.title}</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{card.description}</p>
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Who this is</p>
                <p className="text-xs text-slate-500 leading-relaxed">{card.whoThis}</p>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">What happens next</p>
                <ul className="space-y-1">
                  {card.whatNext.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-[#E8945A] mt-0.5">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-3 mt-auto">{card.upsell}</p>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!selected || saving}
        className="px-12 py-3 text-base"
        style={{ background: selected ? '#E8945A' : undefined, color: selected ? '#fff' : undefined }}
      >
        {saving ? 'Saving…' : 'Continue →'}
      </Button>
    </div>
  );
}