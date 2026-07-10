import { useState } from 'react';

const MOODS = ['😩', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['rough', 'low', 'okay', 'good', 'great'];

export default function BrainCheckWidget() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <p className="text-xs font-medium text-muted-foreground">how's your brain right now?</p>
      <div className="flex justify-between mt-3">
        {MOODS.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`text-2xl transition-transform ${selected === idx ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="text-xs text-muted-foreground mt-2 text-center">Feeling {MOOD_LABELS[selected]}</p>
      )}
    </div>
  );
}