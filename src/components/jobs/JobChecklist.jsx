import { useState } from 'react';
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function JobChecklist({ job, onUpdate, onUpdateWithActivity }) {
  const [newItem, setNewItem] = useState('');
  const items = job.checklist_items || [];

  const save = (updated) => onUpdate({ checklist_items: updated });

  const addItem = async () => {
    if (!newItem.trim()) return;
    const updated = [
      ...items,
      { id: Date.now().toString(), text: newItem.trim(), is_complete: false, completed_at: null },
    ];
    await save(updated);
    setNewItem('');
  };

  const toggleItem = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const nowComplete = !item.is_complete;
    const updated = items.map((i) =>
      i.id !== id
        ? i
        : { ...i, is_complete: nowComplete, completed_at: nowComplete ? new Date().toISOString() : null }
    );
    await save(updated);
    if (nowComplete && onUpdateWithActivity) {
      await onUpdateWithActivity({}, 'checklist_completed', `Checklist item completed: "${item.text}"`, 'seller');
    }
  };

  const deleteItem = async (id) => {
    await save(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Checklist</h3>
      {items.length === 0 && (
        <p className="text-xs text-slate-400">No checklist items yet.</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <button onClick={() => toggleItem(item.id)} className="shrink-0">
            {item.is_complete ? (
              <CheckSquare className="w-4 h-4 text-green-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <span
            className={`flex-1 text-sm ${
              item.is_complete ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
          >
            {item.text}
            {item.is_complete && item.completed_at && (
              <span className="ml-2 text-xs text-slate-400">
                {new Date(item.completed_at).toLocaleDateString()}
              </span>
            )}
          </span>
          <button
            onClick={() => deleteItem(item.id)}
            className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item..."
          className="text-sm h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addItem();
          }}
        />
        <Button size="sm" variant="outline" onClick={addItem} className="h-8 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}