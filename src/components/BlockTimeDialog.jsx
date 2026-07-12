import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BlockTimeDialog({ open, onClose, onSaved, calendarProfiles, prefillDate, businessId }) {
  const toLocal = (d) => {
    const dt = d ? new Date(d) : new Date();
    return dt.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    title: '',
    start_time: toLocal(prefillDate),
    end_time: toLocal(prefillDate ? new Date(new Date(prefillDate).getTime() + 60 * 60000) : new Date(Date.now() + 3600000)),
    calendar_profile_id: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.start_time || !form.end_time) return;
    setLoading(true);
    await base44.entities.BlockedTime.create({
      ...form,
      business_id: businessId || 'default',
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
    });
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Block Off Time</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Reason / Title*</Label>
            <Input placeholder="e.g. Lunch, Holiday, Training" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          {calendarProfiles?.length > 0 && (
            <div>
              <Label>Calendar (Person)</Label>
              <Select value={form.calendar_profile_id} onValueChange={v => set('calendar_profile_id', v)}>
                <SelectTrigger><SelectValue placeholder="All / Business-wide" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All / Business-wide</SelectItem>
                  {calendarProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Start*</Label>
            <Input type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          </div>
          <div>
            <Label>End*</Label>
            <Input type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Block Time'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}