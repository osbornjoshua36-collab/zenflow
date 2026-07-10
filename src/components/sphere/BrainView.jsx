import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SUB_TABS = [{ id: 'brain_dump', label: '💭 brain dump' }, { id: 'notes', label: '📝 notes' }, { id: 'journal', label: '📖 journal' }];
const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', low: '😕', rough: '😩', frustrated: '😤', anxious: '😰', grateful: '🥰' };

export default function BrainView() {
  const [subTab, setSubTab] = useState('brain_dump');
  const [notes, setNotes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [dumpText, setDumpText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [n, j] = await Promise.all([
          base44.entities.Note.list('-created_date', 50),
          base44.entities.JournalEntry.list('-entry_date', 30),
        ]);
        setNotes(n);
        setEntries(j);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const saveDump = async () => {
    if (!dumpText.trim()) return;
    const created = await base44.entities.Note.create({ type: 'brain_dump', content: dumpText });
    setNotes(prev => [created, ...prev]);
    setDumpText('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>🧠 My Brain</h2>
        <p className="text-sm text-muted-foreground mt-0.5">brain dump · notes · journal · anything that needs to get out of your head</p>
      </div>

      <div className="flex gap-2">
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subTab === tab.id ? 'bg-terracotta text-white' : 'bg-secondary hover:bg-secondary/80'}`}>{tab.label}</button>
        ))}
      </div>

      {subTab === 'brain_dump' && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <p className="text-xs text-muted-foreground">get it out of your head. no structure needed. no judgment here.</p>
          <textarea value={dumpText} onChange={e => setDumpText(e.target.value)} placeholder="start typing..." className="w-full mt-3 min-h-[120px] p-3 rounded-lg bg-secondary border border-border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
          <div className="flex gap-2 mt-2">
            <button onClick={saveDump} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-terracotta text-white hover:bg-terracotta-dark">save as note</button>
            <button onClick={() => setDumpText('')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80">clear & done</button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">🔒 private & encrypted · only you can read this</p>
        </div>
      )}

      {subTab === 'notes' && (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="rounded-xl p-4 bg-card border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-terracotta-dark uppercase">{note.type}</span>
                {note.title && <span className="text-sm font-medium">{note.title}</span>}
              </div>
              <p className="text-sm mt-1">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(note.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Start with a brain dump.</p>}
        </div>
      )}

      {subTab === 'journal' && (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="rounded-xl p-4 bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">{MOOD_EMOJI[entry.mood] || '😐'}</span>
                <span className="text-sm font-medium">{new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <span className="text-xs text-muted-foreground">· mood: {entry.mood}</span>
              </div>
              {entry.entry_text && <p className="text-sm mt-2">{entry.entry_text}</p>}
              {entry.gratitudes?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">grateful for</p>
                  {entry.gratitudes.map((g, i) => <p key={i} className="text-xs text-muted-foreground">{i + 1}. {g}</p>)}
                </div>
              )}
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No journal entries yet.</p>}
        </div>
      )}
    </div>
  );
}