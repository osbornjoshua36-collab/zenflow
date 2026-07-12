import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'family', label: 'Family' },
  { value: 'errands', label: 'Errands' },
  { value: 'learning', label: 'Learning' },
  { value: 'other', label: 'Other' },
];

function toLocalDate(d) {
  if (!d) return new Date().toISOString().split('T')[0];
  return new Date(d).toISOString().split('T')[0];
}

function toLocalTime(d) {
  if (!d) return '09:00';
  const h = new Date(d).getHours();
  return `${String(h).padStart(2, '0')}:00`;
}

export default function PersonalTaskDialog({ open, onClose, onSaved, task = null, prefillDate = null }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: '',
    scheduled_date: toLocalDate(new Date()),
    scheduled_time: '09:00',
    duration_minutes: 15,
    category: 'personal',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: task?.title || '',
        scheduled_date: task?.scheduled_date || toLocalDate(prefillDate || new Date()),
        scheduled_time: task?.scheduled_time || toLocalTime(prefillDate),
        duration_minutes: task?.duration_minutes || 15,
        category: task?.category || 'personal',
      });
    }
  }, [open, task, prefillDate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.scheduled_date) return;
    setLoading(true);
    try {
      if (isEdit) {
        await base44.entities.PersonalTask.update(task.id, form);
      } else {
        await base44.entities.PersonalTask.create(form);
      }
    } catch (e) {
      console.error('Failed to save personal task:', e);
    }
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'Add Personal Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Title*</Label>
            <Input className="mt-1" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What do you need to do?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date*</Label>
              <Input className="mt-1" type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input className="mt-1" type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (min)</Label>
              <Input className="mt-1" type="number" min="5" step="5" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value) || 15)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={loading || !form.title}>
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Task')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}