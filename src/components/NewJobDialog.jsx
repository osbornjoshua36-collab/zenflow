import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import ProposeTimesDialog from '@/components/ProposeTimesDialog';

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
  technician_name: '',
  scheduled_date: '',
  scheduled_time: '',
  estimated_duration_hours: '',
  estimated_cost: '',
  notes: '',
};

export default function NewJobDialog({ open, onClose, customers: customersProp, onJobCreated }) {
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });
  const [sendProposed, setSendProposed] = useState(true);
  const [createdJob, setCreatedJob] = useState(null);

  useEffect(() => {
    if (!open) return;
    const list = Object.values(customersProp || {});
    setCustomers(list);
    setShowAddCustomer(list.length === 0);
    (async () => {
      const me = await base44.auth.me();
      if (!me) return;
      const biz = await base44.entities.Business.filter({ owner_email: me.email });
      setBusiness(biz[0] || null);
    })();
  }, [open, customersProp]);

  const set = (key, val) =>
    setForm((f) => ({
      ...f,
      [key]: val,
      // Auto-populate title from service_category if title is empty
      ...(key === 'service_category' && !f.title ? { title: val } : {}),
    }));

  const handleAddCustomer = async () => {
    if (!newCust.name || !newCust.phone) return;
    const c = await base44.entities.Customer.create({
      business_id: business?.id || '',
      name: newCust.name,
      phone: newCust.phone,
      email: newCust.email,
    });
    setCustomers((prev) => [...prev, c]);
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
      technician_name: form.technician_name,
      scheduled_date: scheduledDate,
      estimated_duration_hours: parseFloat(form.estimated_duration_hours) || 1,
      estimated_cost: parseFloat(form.estimated_cost) || 0,
      notes_internal: form.notes,
      status: 'Scheduled',
      scheduling_status: 'awaiting_proposal',
      checklist_items: [],
      photos_before: [],
      photos_after: [],
      job_activity: [
        {
          timestamp: new Date().toISOString(),
          event_type: 'job_created',
          description: 'Job created',
          actor: 'seller',
        },
      ],
    });
    setSaving(false);
    if (sendProposed) {
      setCreatedJob(job);
    } else {
      resetForm();
      onJobCreated();
      onClose();
    }
  };

  const resetForm = () => {
    setForm(BLANK_FORM);
    setCreatedJob(null);
    setSendProposed(true);
    setNewCust({ name: '', phone: '', email: '' });
  };

  // After creation, open ProposeTimesDialog inline
  if (createdJob) {
    return (
      <ProposeTimesDialog
        job={createdJob}
        onClose={() => { resetForm(); onJobCreated(); onClose(); }}
        onSaved={() => { resetForm(); onJobCreated(); onClose(); }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Customer select */}
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id} onValueChange={(v) => set('customer_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!showAddCustomer && (
              <button
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={() => setShowAddCustomer(true)}
              >
                + Add new customer
              </button>
            )}
          </div>

          {/* Inline new customer */}
          {showAddCustomer && (
            <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-medium text-slate-600">New customer</p>
              <Input
                placeholder="Full name *"
                value={newCust.name}
                onChange={(e) => setNewCust((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Phone *"
                value={newCust.phone}
                onChange={(e) => setNewCust((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                placeholder="Email (optional)"
                value={newCust.email}
                onChange={(e) => setNewCust((f) => ({ ...f, email: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleAddCustomer}
                  disabled={!newCust.name || !newCust.phone}
                >
                  Add &amp; select
                </Button>
                {customers.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddCustomer(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Service category */}
          <div>
            <Label>Service Category</Label>
            <Input
              value={form.service_category}
              onChange={(e) => set('service_category', e.target.value)}
              placeholder="e.g. AC Repair, Pipe Replacement"
            />
          </div>

          {/* Job title */}
          <div>
            <Label>Job Title</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Job title"
            />
          </div>

          {/* Job type */}
          <div>
            <Label>Job Type</Label>
            <Select value={form.job_type} onValueChange={(v) => set('job_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => set('scheduled_date', e.target.value)}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => set('scheduled_time', e.target.value)}
              />
            </div>
          </div>

          {/* Duration / cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={form.estimated_duration_hours}
                onChange={(e) => set('estimated_duration_hours', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <Label>Est. Cost ($)</Label>
              <Input
                type="number"
                value={form.estimated_cost}
                onChange={(e) => set('estimated_cost', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Technician */}
          <div>
            <Label>Technician</Label>
            <Input
              value={form.technician_name}
              onChange={(e) => set('technician_name', e.target.value)}
              placeholder="Assign technician"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Internal notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Private notes (not visible to customer)"
            />
          </div>

          {/* Scheduling intent toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Propose times to customer</p>
              <p className="text-xs text-slate-500">Send available slots immediately after creating</p>
            </div>
            <Switch checked={sendProposed} onCheckedChange={setSendProposed} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={
                saving ||
                !form.customer_id ||
                !form.title ||
                !form.scheduled_date ||
                !form.scheduled_time
              }
            >
              {saving
                ? 'Creating…'
                : sendProposed
                ? 'Create & propose times'
                : 'Create job'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}