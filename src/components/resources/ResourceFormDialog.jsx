import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Building, Wrench, Truck } from 'lucide-react';

const PRESET_COLOURS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#14B8A6','#F97316'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TYPE_OPTIONS = [
  { value: 'staff', label: 'Staff', icon: User },
  { value: 'space', label: 'Space', icon: Building },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'vehicle', label: 'Vehicle', icon: Truck },
];

const BLANK = {
  resource_type: 'staff',
  name: '',
  role: '',
  colour: '#3B82F6',
  working_hours_start: '08:00',
  working_hours_end: '17:00',
  working_days: [1,2,3,4,5],
  notes: '',
  is_active: true,
};

export default function ResourceFormDialog({ open, resource, business, onClose, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(resource ? { ...BLANK, ...resource } : BLANK);
  }, [open, resource]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleDay = (d) => {
    const days = form.working_days || [];
    set('working_days', days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, business_id: business?.id };
    if (resource?.id) {
      await base44.entities.Resource.update(resource.id, data);
    } else {
      await base44.entities.Resource.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">

          {/* Resource type */}
          <div>
            <Label className="mb-2 block">Resource type</Label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: TypeIcon }) => (
                <button
                  key={value}
                  onClick={() => set('resource_type', value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-xs font-medium ${
                    form.resource_type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <TypeIcon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Sarah Webb, Treatment Room 2" />
          </div>

          {/* Role */}
          <div>
            <Label>Role <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="e.g. Dentist, Hygienist, Lead Technician" />
            <p className="text-xs text-slate-400 mt-1">Used to filter resources when assigning to jobs</p>
          </div>

          {/* Colour */}
          <div>
            <Label className="mb-2 block">Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLOURS.map(c => (
                <button
                  key={c}
                  onClick={() => set('colour', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.colour === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={form.colour || '#3B82F6'}
                onChange={e => set('colour', e.target.value)}
                className="w-8 h-8 rounded-full border border-slate-300 cursor-pointer p-0.5"
                title="Custom colour"
              />
            </div>
          </div>

          {/* Working hours */}
          <div>
            <Label className="mb-2 block">Working hours</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">From</p>
                <Input type="time" value={form.working_hours_start || '08:00'} onChange={e => set('working_hours_start', e.target.value)} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Until</p>
                <Input type="time" value={form.working_hours_end || '17:00'} onChange={e => set('working_hours_end', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Working days */}
          <div>
            <Label className="mb-2 block">Working days</Label>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium border transition-colors ${
                    (form.working_days || []).includes(i)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Staff permissions */}
          {form.resource_type === 'staff' && (
            <div className="space-y-2">
              <Label className="block">Staff Permissions</Label>
              {[
                { key: 'can_cancel_jobs', label: 'Can cancel jobs', desc: 'Allow this employee to cancel jobs from their portal' },
                { key: 'can_block_own_calendar', label: 'Can block own calendar', desc: 'Allow this employee to add breaks or blocked time from their portal' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3 bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set(key, !form[key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Certifications, restrictions, etc."
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-md resize-none h-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save resource'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}