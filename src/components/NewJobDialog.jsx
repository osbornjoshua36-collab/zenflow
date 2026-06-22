import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User, Building, Wrench, Truck, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import ProposeTimesDialog from '@/components/ProposeTimesDialog';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const JOB_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'emergency', label: 'Emergency' },
];

const BLANK_FORM = {
  customer_id: '',
  title: '',
  service_category: '',
  job_type: 'residential',
  scheduled_date: '',
  scheduled_time: '',
  duration_minutes: 60,
  estimated_cost: '',
  notes_internal: '',
  notes_shared: '',
  appointment_template_id: '',
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
};

export default function NewJobDialog({ open, onClose, customers: customersProp, onJobCreated }) {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [resourceAssignments, setResourceAssignments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });
  const [sendProposed, setSendProposed] = useState(true);
  const [createdJob, setCreatedJob] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [conflictWarnings, setConflictWarnings] = useState({}); // { slotIdx: conflictMessage }

  useEffect(() => {
    if (!open) return;
    const list = Object.values(customersProp || {});
    setCustomers(list);
    setShowAddCustomer(list.length === 0);
    setForm(BLANK_FORM);
    setResourceAssignments([]);
    setSelectedTemplate(null);
    (async () => {
      const me = await base44.auth.me();
      if (!me) return;
      const biz = await base44.entities.Business.filter({ owner_email: me.email });
      setBusiness(biz[0] || null);
      if (biz[0]) {
        const [tmpl, res] = await Promise.all([
          base44.entities.AppointmentTemplate.filter({ business_id: biz[0].id, is_active: true }),
          base44.entities.Resource.filter({ business_id: biz[0].id, is_active: true }),
        ]);
        setTemplates(tmpl);
        setAllResources(res);
      }
    })();
  }, [open, customersProp]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleTemplateSelect = (templateId) => {
    if (templateId === 'custom') {
      setSelectedTemplate(null);
      set('appointment_template_id', '');
      set('buffer_before_minutes', 0);
      set('buffer_after_minutes', 0);
      setResourceAssignments([]);
      return;
    }
    const tmpl = templates.find(t => t.id === templateId);
    setSelectedTemplate(tmpl || null);
    setForm(f => ({
      ...f,
      appointment_template_id: templateId,
      title: f.title || tmpl?.name || '',
      service_category: f.service_category || tmpl?.service_category || '',
      duration_minutes: tmpl?.default_duration_minutes || 60,
      buffer_before_minutes: tmpl?.buffer_minutes_before || 0,
      buffer_after_minutes: tmpl?.buffer_minutes_after || 0,
    }));
    // Init resource assignment slots from template
    if (tmpl?.required_resources?.length) {
      setResourceAssignments(tmpl.required_resources.map(slot => ({ ...slot, resource_id: '' })));
    } else {
      setResourceAssignments([]);
    }
  };

  const checkConflict = async (resourceId, slotIdx) => {
    if (!resourceId || !form.scheduled_date || !form.scheduled_time) {
      setConflictWarnings(w => { const n = { ...w }; delete n[slotIdx]; return n; });
      return;
    }
    const start = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
    const end = new Date(start.getTime() + (form.duration_minutes || 60) * 60 * 1000);
    const existing = await base44.entities.ResourceAssignment.filter({ resource_id: resourceId });
    const conflict = existing.find(a =>
      a.status !== 'cancelled' &&
      new Date(a.start_datetime) < end &&
      new Date(a.end_datetime) > start
    );
    if (conflict) {
      const from = new Date(conflict.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const to = new Date(conflict.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      setConflictWarnings(w => ({ ...w, [slotIdx]: `Already booked ${from} – ${to}` }));
    } else {
      setConflictWarnings(w => { const n = { ...w }; delete n[slotIdx]; return n; });
    }
  };

  // Get available resources for a slot based on selected date/time
  const getAvailableResources = (slot) => {
    if (!form.scheduled_date || !form.scheduled_time) return allResources;
    const start = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
    const end = new Date(start.getTime() + (form.duration_minutes || 60) * 60 * 1000);
    return allResources.filter(r => {
      if (slot.resource_type && r.resource_type !== slot.resource_type) return false;
      if (slot.role_filter && r.role && r.role.toLowerCase() !== slot.role_filter.toLowerCase()) return false;
      return true;
    });
  };

  const handleAddCustomer = async () => {
    if (!newCust.name || !newCust.phone) return;
    const c = await base44.entities.Customer.create({
      business_id: business?.id || '',
      name: newCust.name, phone: newCust.phone, email: newCust.email,
    });
    setCustomers(prev => [...prev, c]);
    set('customer_id', c.id);
    setShowAddCustomer(false);
    setNewCust({ name: '', phone: '', email: '' });
  };

  const handleSubmit = async () => {
    if (!form.customer_id || !form.title || !form.scheduled_date || !form.scheduled_time) return;
    setSaving(true);
    const scheduledDate = new Date(`${form.scheduled_date}T${form.scheduled_time}`).toISOString();
    const job = await base44.entities.Job.create({
      business_id: business?.id || 'default',
      customer_id: form.customer_id,
      title: form.title,
      service_category: form.service_category,
      job_type: form.job_type,
      scheduled_date: scheduledDate,
      appointment_template_id: form.appointment_template_id || null,
      duration_minutes: form.duration_minutes || 60,
      buffer_before_minutes: form.buffer_before_minutes || 0,
      buffer_after_minutes: form.buffer_after_minutes || 0,
      estimated_cost: parseFloat(form.estimated_cost) || 0,
      notes_internal: form.notes_internal,
      notes_shared: form.notes_shared,
      status: 'Scheduled',
      scheduling_status: 'awaiting_proposal',
      checklist_items: [],
      photos_before: [],
      photos_after: [],
      job_activity: [{ timestamp: new Date().toISOString(), event_type: 'job_created', description: 'Job created', actor: 'seller' }],
    });

    // Create resource assignments
    const startDt = new Date(scheduledDate);
    const endDt = new Date(startDt.getTime() + (form.duration_minutes || 60) * 60 * 1000);
    for (const slot of resourceAssignments) {
      if (!slot.resource_id) continue;
      await base44.entities.ResourceAssignment.create({
        job_id: job.id,
        resource_id: slot.resource_id,
        slot_label: slot.slot_label || '',
        start_datetime: new Date(startDt.getTime() - (form.buffer_before_minutes || 0) * 60000).toISOString(),
        end_datetime: new Date(endDt.getTime() + (form.buffer_after_minutes || 0) * 60000).toISOString(),
        status: 'confirmed',
        assigned_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    if (sendProposed) {
      setCreatedJob(job);
    } else {
      onJobCreated();
      onClose();
      navigate(`/jobs/${job.id}`);
    }
  };

  const resetForm = () => {
    setForm(BLANK_FORM);
    setCreatedJob(null);
    setSendProposed(true);
    setNewCust({ name: '', phone: '', email: '' });
    setSelectedTemplate(null);
    setResourceAssignments([]);
  };

  if (createdJob) {
    return (
      <ProposeTimesDialog
        job={createdJob}
        onClose={() => { resetForm(); onJobCreated(); onClose(); }}
        onSaved={() => { resetForm(); onJobCreated(); onClose(); }}
      />
    );
  }

  const hasDateTime = form.scheduled_date && form.scheduled_time;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Appointment type */}
          <div>
            <Label>Appointment type</Label>
            <Select value={form.appointment_template_id || 'custom'} onValueChange={handleTemplateSelect}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom (no template)</SelectItem>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Template summary */}
          {selectedTemplate && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p className="font-medium">{selectedTemplate.name}</p>
              <p>{formatDuration(selectedTemplate.default_duration_minutes)} appointment
                {(selectedTemplate.buffer_minutes_before > 0 || selectedTemplate.buffer_minutes_after > 0) &&
                  ` · +${selectedTemplate.buffer_minutes_before}min before, +${selectedTemplate.buffer_minutes_after}min after`}
              </p>
              {selectedTemplate.required_resources?.length > 0 && (
                <p>Requires: {selectedTemplate.required_resources.map(r => r.slot_label).join(', ')}</p>
              )}
            </div>
          )}

          {/* Customer */}
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!showAddCustomer && (
              <button className="text-xs text-blue-600 hover:underline mt-1" onClick={() => setShowAddCustomer(true)}>
                + Add new customer
              </button>
            )}
          </div>

          {showAddCustomer && (
            <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-medium text-slate-600">New customer</p>
              <Input placeholder="Full name *" value={newCust.name} onChange={e => setNewCust(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Phone *" value={newCust.phone} onChange={e => setNewCust(f => ({ ...f, phone: e.target.value }))} />
              <Input placeholder="Email (optional)" value={newCust.email} onChange={e => setNewCust(f => ({ ...f, email: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCustomer} disabled={!newCust.name || !newCust.phone}>Add & select</Button>
                {customers.length > 0 && <Button size="sm" variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>}
              </div>
            </div>
          )}

          {/* Service title */}
          <div>
            <Label>Service title</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Job title" />
          </div>

          {/* Service category */}
          <div>
            <Label>Service category</Label>
            <Input value={form.service_category} onChange={e => set('service_category', e.target.value)} placeholder="e.g. AC Repair, Pipe Replacement" />
          </div>

          {/* Job type */}
          <div>
            <Label>Job type</Label>
            <Select value={form.job_type} onValueChange={v => set('job_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date / time */}
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

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration — <span className="font-semibold">{formatDuration(form.duration_minutes || 60)}</span></Label>
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="outline" className="px-2" onClick={() => set('duration_minutes', Math.max(15, (form.duration_minutes || 60) - 15))}>−15</Button>
                <span className="flex-1 flex items-center justify-center text-sm text-slate-700">{form.duration_minutes || 60}min</span>
                <Button size="sm" variant="outline" className="px-2" onClick={() => set('duration_minutes', Math.min(480, (form.duration_minutes || 60) + 15))}>+15</Button>
              </div>
            </div>
            <div>
              <Label>Est. Cost ($)</Label>
              <Input type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Resource assignment step (shown once date+time selected) */}
          {hasDateTime && resourceAssignments.length > 0 && (
            <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Assign Resources</p>
              {resourceAssignments.map((slot, idx) => {
                const available = getAvailableResources(slot);
                return (
                  <div key={idx}>
                    <Label className="text-xs">
                      {slot.slot_label}
                      {slot.is_required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Select
                      value={slot.resource_id || ''}
                      onValueChange={v => {
                        const updated = [...resourceAssignments];
                        updated[idx] = { ...updated[idx], resource_id: v };
                        setResourceAssignments(updated);
                        checkConflict(v, idx);
                      }}
                    >
                      <SelectTrigger className={`mt-0.5 ${conflictWarnings[idx] ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}>
                        <SelectValue placeholder="Select resource…" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map(r => {
                          const Icon = TYPE_ICONS[r.resource_type] || User;
                          return (
                            <SelectItem key={r.id} value={r.id}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: r.colour || '#94A3B8' }} />
                                {r.name}{r.role ? ` · ${r.role}` : ''}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {conflictWarnings[idx] && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span><strong>Scheduling conflict:</strong> {conflictWarnings[idx]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Internal notes <span className="text-slate-400 font-normal text-xs">(private)</span></Label>
              <Input value={form.notes_internal} onChange={e => set('notes_internal', e.target.value)} placeholder="Not visible to customer" />
            </div>
            <div>
              <Label>Notes for customer <span className="text-slate-400 font-normal text-xs">(shared)</span></Label>
              <Input value={form.notes_shared} onChange={e => set('notes_shared', e.target.value)} placeholder="Visible to customer" />
            </div>
          </div>

          {/* Scheduling toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Propose times to customer</p>
              <p className="text-xs text-slate-500">Send available slots immediately after creating</p>
            </div>
            <Switch checked={sendProposed} onCheckedChange={setSendProposed} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !form.customer_id || !form.title || !form.scheduled_date || !form.scheduled_time}
            >
              {saving ? 'Creating…' : sendProposed ? 'Create & propose times' : 'Block & Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}