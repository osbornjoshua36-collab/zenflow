import { useState } from 'react';
import { Button } from '@/components/ui/button';

const TEMPLATES = [
  {
    id: 'BOLD_CRAFT',
    name: 'Bold Craft',
    description: 'High-contrast, trades-focused. Best for HVAC, plumbing, roofing, electrical.',
    emoji: '🔨',
    palette: ['#1a1a1a', '#e05c00', '#f4f4f4'],
  },
  {
    id: 'CLEAN_PRO',
    name: 'Clean Pro',
    description: 'Minimal, modern, credibility-first. Best for cleaning, pest control, contractors.',
    emoji: '✨',
    palette: ['#0d2b45', '#4a7c59', '#ffffff'],
  },
  {
    id: 'WARM_LOCAL',
    name: 'Warm Local',
    description: 'Friendly and personal. Best for salons, wellness, pet services, personal care.',
    emoji: '🌿',
    palette: ['#c0614a', '#2a6b72', '#fff8f0'],
  },
];

export default function TemplateSwitcher({ current, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(current);
  const [confirming, setConfirming] = useState(false);

  const handleApply = () => {
    if (selected === current) { onCancel(); return; }
    setConfirming(true);
  };

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Switch Template?</h3>
          <p className="text-sm text-slate-600 mb-6">
            Switching templates will reset your layout and colors. Your text content and photos will be kept.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onConfirm(selected)}>
              Yes, Switch Template
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Choose a Template</h3>
        <div className="space-y-3 mb-6">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    {t.id === current && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                  <div className="flex gap-1.5 mt-2">
                    {t.palette.map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApply}>Apply Template</Button>
        </div>
      </div>
    </div>
  );
}