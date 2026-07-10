import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import GoalCard from '@/components/sphere/GoalCard';

const CATEGORIES = [
  { id: 'all', label: 'all' },
  { id: 'social', label: '🤝 social' },
  { id: 'health', label: '💪 health' },
  { id: 'family', label: '👨‍👩‍👧 family' },
  { id: 'personal_dev', label: '🌱 personal dev' },
  { id: 'finances', label: '💰 finances' },
  { id: 'spiritual', label: '🙏 spiritual' },
  { id: 'career', label: '💼 career' },
];

export default function GoalsView() {
  const [goals, setGoals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Goal.filter({ is_active: true }, '-created_date', 50);
        setGoals(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = filter === 'all' ? goals : goals.filter(g => g.category === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>🎯 My Goals</h2>
          <p className="text-sm text-muted-foreground mt-0.5">track progress across all areas of your life</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-terracotta text-white hover:bg-terracotta-dark"><Plus className="w-3.5 h-3.5" /> add goal</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setFilter(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === cat.id ? 'bg-terracotta text-white' : 'bg-secondary hover:bg-secondary/80'}`}>{cat.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No goals in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}
    </div>
  );
}