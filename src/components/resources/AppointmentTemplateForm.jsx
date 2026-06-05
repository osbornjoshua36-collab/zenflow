import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

const PRESET_COLOURS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#14B8A6','#F97316'];
const CATEGORIES = ['HVAC','Plumbing','Electrical','Salon','Real Estate','Cleaning','Landscaping','Other'];
const RESOURCE_TYPES = ['staff','space','equipment','vehicle','team'];

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`;
  return `${h} hour${h > 1 ? 's' : ''} ${m} minutes`;
}

const BLANK_SLOT = { slot_label: '', resource_type: 'staff', role_filter: '', quantity: 1, is_required: true };

export default function AppointmentTemplateForm({ template, business, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_duration_minutes: 60,
    service_category: '',
    colour: '#3B82F6',
    is_active: true,
    buffer_minutes_before: 0,
    buffer_minutes_after: 0,
    required_resources: [],
  });
  const [existingRoles, setExistingRoles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) setForm({ ...form, ...template });
    if (business) {
      base44.entities.Resource.filter({ business_id: business.id }).then(res => {
        const roles = [...new Set(res.map(r => r.role).filter(Boolean))];
        setExistingRoles(roles);
      });
    }
  }, [template, business]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateSlot = (idx, key, val) => {
    const slots = [...form.required_resources];
    slots[idx] = { ...slots[idx], [key]: val };
    set('required_resources', slots);
  };

  const addSlot = () => set('required_resources', [...form.required_resources, { ...BLANK_SLOT }]);
  const removeSlot = (idx) => set('required_resources', form.required_resources.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data = { ...form, business_id: business?.id };
    if (template?.id) {
      await base44.entities.AppointmentTemplate.update(template.id, data);
    } else {
      await base44.entities.AppointmentTemplate.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const totalMins = (form.default_duration_minutes || 0) + (form.buffer_minutes_before || 0) + (form.buffer_minutes_after || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-bold text-slate-900">{template ? 'Edit Template' : 'New Template'}</h1>
      </div>

      {/* Section 1 */}
      <div className="bg-white rounded-xl border p-5 space-y-5">
        <h2 className="font-semibold text-slate-800">Template basics</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Routine Cleaning, AC Installation" />
          </div>
          <div>
            <Label>Service category</Label>
            <Select value={form.service_category || ''} onValueChange={v => set('service_category', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {PRESET_COLOURS.map(c => (
                <button key={c} onClick={() => set('colour', c)}
                  className={`w-7 h-7 rounded-full border-2 ${form.colour === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Default duration: <span className="font-semibold">{formatDuration(form.default_duration_minutes || 60)}</span></Label>
          <input
            type="range" min={15} max={480} step={15}
            value={form.default_duration_minutes || 60}
            onChange={e => set('default_duration_minutes', parseInt(e.target.value))}
            className="w-full mt-2"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>15 min</span><span>2h</span><span>4h</span><span>6h</span><span>8h</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Buffer before (minutes)</Label>
            <Input type="number" min={0} value={form.buffer_minutes_before || 0} onChange={e => set('buffer_minutes_before', parseInt(e.target.value) || 0)} />
            <p className="text-xs text-slate-400 mt-1">Prep time before appointment starts</p>
          </div>
          <div>
            <Label>Buffer after (minutes)</Label>
            <Input type="number" min={0} value={form.buffer_minutes_after || 0} onChange={e => set('buffer_minutes_after', parseInt(e.target.value) || 0)} />
            <p className="text-xs text-slate-400 mt-1">Cleanup or travel time after appointment</p>
          </div>
        </div>

        <div>
          <Label>Description <span className="text-slate-400 font-normal">(optional)</span></Label>
          <textarea
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            placeholder="What this appointment type involves"
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-md resize-none h-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={300}
          />
        </div>
      </div>

      {/* Section 2 — Resource requirements */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Required resources</h2>
          <Button size="sm" variant="outline" onClick={addSlot} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add requirement
          </Button>
        </div>

        {form.required_resources.length === 0 && (
          <p className="text-sm text-slate-400">No resource requirements. This appointment can be booked without assigning specific resources.</p>
        )}

        <div className="space-y-3">
          {form.required_resources.map((slot, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Slot {idx + 1}</span>
                <button onClick={() => removeSlot(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Slot label *</Label>
                  <Input value={slot.slot_label} onChange={e => updateSlot(idx, 'slot_label', e.target.value)} placeholder="e.g. Treating dentist" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Resource type</Label>
                  <Select value={slot.resource_type} onValueChange={v => updateSlot(idx, 'resource_type', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Role filter <span className="text-slate-400">(optional)</span></Label>
                  <Input
                    value={slot.role_filter || ''}
                    onChange={e => updateSlot(idx, 'role_filter', e.target.value)}
                    placeholder="e.g. Dentist"
                    list={`roles-${idx}`}
                    className="mt-1"
                  />
                  <datalist id={`roles-${idx}`}>
                    {existingRoles.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={1} max={20} value={slot.quantity || 1} onChange={e => updateSlot(idx, 'quantity', parseInt(e.target.value) || 1)} className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!slot.is_required} onCheckedChange={v => updateSlot(idx, 'is_required', v)} />
                <span className="text-xs text-slate-600">Required — must be filled before confirming appointment</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Preview */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Preview</h2>
        {form.required_resources.length > 0 && (
          <div className="text-sm text-slate-700 mb-2">
            <span className="font-medium">This appointment requires: </span>
            {form.required_resources.map((s, i) => (
              <span key={i}>{i > 0 ? ', ' : ''}{s.quantity > 1 ? `${s.quantity}× ` : ''}{s.slot_label || s.resource_type}{s.role_filter ? ` (${s.role_filter})` : ''}{s.is_required ? '' : ' (optional)'}</span>
            ))}
          </div>
        )}
        <p className="text-sm text-slate-600">
          <span className="font-medium">Total blocked time including buffers: </span>
          {formatDuration(totalMins)}
          {(form.buffer_minutes_before > 0 || form.buffer_minutes_after > 0) && (
            <span className="text-slate-400"> ({formatDuration(form.default_duration_minutes)} + {form.buffer_minutes_before}min before + {form.buffer_minutes_after}min after)</span>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save template'}
        </Button>
      </div>
    </div>
  );
}