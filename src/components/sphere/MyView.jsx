import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ClipboardList, Sparkles, Play } from 'lucide-react';
import FocusBanner from '@/components/sphere/FocusBanner';
import Next30Minutes from '@/components/sphere/Next30Minutes';
import Top3Card from '@/components/sphere/Top3Card';
import RemindersWidget from '@/components/sphere/RemindersWidget';
import GoalWidget from '@/components/sphere/GoalWidget';
import StreakWidget from '@/components/sphere/StreakWidget';
import BrainCheckWidget from '@/components/sphere/BrainCheckWidget';
import HealthWidget from '@/components/sphere/HealthWidget';
import PriorityReviewDialog from '@/components/sphere/PriorityReviewDialog';

export default function MyView() {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPriorityReview, setShowPriorityReview] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      try {
        const [todayTasks, activeGoals, entries] = await Promise.all([
          base44.entities.PersonalTask.filter({ scheduled_date: today }, 'scheduled_time', 50),
          base44.entities.Goal.filter({ is_active: true }, '-created_date', 20),
          base44.entities.JournalEntry.list('-entry_date', 30),
        ]);
        setTasks(todayTasks);
        setGoals(activeGoals);
        setJournalEntries(entries);
      } catch (e) {
        console.error('Failed to load My View data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [today, refreshKey]);

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const oneThing = tasks.find(t => t.priority_level === 'one_thing' && !t.completed);
  const top3 = tasks.filter(t => t.priority_level === 'top3' && !t.completed);
  const prioritiesSet = !!oneThing || top3.length > 0;
  const refresh = () => setRefreshKey(k => k + 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{todayDate}</p>
        <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-fraunces)' }}>☀️ My View</h1>
        <p className="text-sm text-muted-foreground mt-0.5">your day at a glance — focused, clear, doable</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowPriorityReview(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-terracotta text-white hover:bg-terracotta-dark transition-colors">
          <ClipboardList className="w-3.5 h-3.5" /> priorities
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors">
          <Sparkles className="w-3.5 h-3.5" /> customize view
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors">
          <Play className="w-3.5 h-3.5" /> start focus session
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors">
          <Plus className="w-3.5 h-3.5" /> add task
        </button>
      </div>

      {!prioritiesSet && (
        <div className="rounded-xl p-4 bg-terracotta-light border border-terracotta/20 flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Time to set your priorities</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your daily priority review is scheduled — pick your #1 thing and top 3 for today.</p>
            <button onClick={() => setShowPriorityReview(true)} className="mt-2 text-xs font-medium text-terracotta-dark hover:underline">review now →</button>
          </div>
        </div>
      )}

      <FocusBanner task={oneThing} onUnset={() => setShowPriorityReview(true)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Next30Minutes tasks={tasks} />
        <Top3Card tasks={top3} onSet={() => setShowPriorityReview(true)} />
      </div>

      <RemindersWidget tasks={tasks} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GoalWidget goals={goals} />
        <StreakWidget entries={journalEntries} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BrainCheckWidget />
        <HealthWidget />
      </div>

      {showPriorityReview && (
        <PriorityReviewDialog tasks={tasks} onClose={() => setShowPriorityReview(false)} onSaved={refresh} />
      )}
    </div>
  );
}