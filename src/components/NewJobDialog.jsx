import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewJobDialog({ open, onClose, customers, onJobCreated }) {
  const [form, setForm] = useState({
    customer_id: '',
    title: '',
    technician_name: '',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration_hours: '',
    estimated_cost: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.customer_id || !form.title || !form.scheduled_date || !form.scheduled_time) return;
    setSaving(true);
    const scheduledDate = new Date(`${form.scheduled_date}T${form.scheduled_time}`).toISOString();
    const customer = customers[form.customer_id];
    await base44.entities.Job.create({
      business_id: customer?.business_id || 'default',
      customer_id: form.customer_id,
      title: form.title,
      technician_name: form.technician_name,
      scheduled_date: scheduledDate,
      estimated_duration_hours: parseFloat(form.estimated_duration_hours) || 1,
      estimated_cost: parseFloat(form.estimated_cost) || 0,
      notes: form.notes,
      status: 'Scheduled',
    });
    setSaving(false);
    setForm({ customer_id: '', title: '', technician_name: '', scheduled_date: '', scheduled_time: '', estimated_duration_hours: '', estimated_cost: '', notes: '' });
    onJobCreated();
    onClose();
  };

  const customerList = Object.values(customers);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customerList.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Service / Job Title</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AC Repair" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (hours)</Label>
              <Input type="number" min="0.5" step="0.5" value={form.estimated_duration_hours} onChange={e => set('estimated_duration_hours', e.target.value)} placeholder="1" />
            </div>
            <div>
              <Label>Est. Cost ($)</Label>
              <Input type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <Label>Technician</Label>
            <Input value={form.technician_name} onChange={e => set('technician_name', e.target.value)} placeholder="Assign technician" />
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={saving || !form.customer_id || !form.title || !form.scheduled_date || !form.scheduled_time}
            >
              {saving ? 'Saving...' : 'Block & Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}