import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'pink'];

export default function CalendarProfileDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', technician_name: '', color: 'blue' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return;
    setLoading(true);
    await base44.entities.CalendarProfile.create({ ...form, business_id: 'default' });
    setLoading(false);
    setForm({ name: '', technician_name: '', color: 'blue' });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Calendar / Person</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Calendar Name*</Label>
            <Input placeholder="e.g. John's Schedule, Truck 2" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Technician Name</Label>
            <Input placeholder="Assigned person" value={form.technician_name} onChange={e => set('technician_name', e.target.value)} />
          </div>
          <div>
            <Label>Color</Label>
            <Select value={form.color} onValueChange={v => set('color', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Add Calendar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}