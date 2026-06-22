import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, X, User, Building, Wrench, Truck, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };

function fmtTime(dt) {
  return dt ? format(new Date(dt), 'h:mm a') : '—';
}

export default function JobResourcesSection({ job, onUpdated }) {
  const [assignments, setAssignments] = useState([]);
  const [resources, setResources] = useState({});
  const [allResources, setAllResources] = useState([]);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  useEffect(() => {
    if (job?.id) loadData();
  }, [job?.id]);

  const loadData = async () => {
    const [asgns, bizList] = await Promise.all([
      base44.entities.ResourceAssignment.filter({ job_id: job.id }),
      job.business_id ? base44.entities.Resource.filter({ business_id: job.business_id }) : Promise.resolve([]),
    ]);
    setAssignments(asgns);
    const rMap = {};
    bizList.forEach(r => { rMap[r.id] = r; });
    setResources(rMap);
    setAllResources(bizList.filter(r => r.is_active));

    if (job.appointment_template_id) {
      const tmpl = await base44.entities.AppointmentTemplate.filter({ id: job.appointment_template_id });
      setTemplate(tmpl[0] || null);
    }
  };

  const handleRemove = async (assignment) => {
    await base44.entities.ResourceAssignment.update(assignment.id, { status: 'cancelled' });
    loadData();
    onUpdated?.();
  };

  const handleAddForce = async () => {
    if (!conflictWarning) return;
    const { resource, start, end } = conflictWarning;
    setConflictWarning(null);
    setSaving(true);
    await base44.entities.ResourceAssignment.create({
      job_id: job.id,
      resource_id: resource.id,
      slot_label: 'Additional resource',
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      status: 'confirmed',
      assigned_at: new Date().toISOString(),
    });
    setShowAddSearch(false);
    setSearch('');
    setSaving(false);
    loadData();
    onUpdated?.();
  };

  const handleAdd = async (resource) => {
    setSaving(true);
    const start = job.scheduled_date ? new Date(job.scheduled_date) : new Date();
    const durationMins = job.duration_minutes || 60;
    const end = new Date(start.getTime() + durationMins * 60 * 1000);

    // Client-side conflict check
    const existing = await base44.entities.ResourceAssignment.filter({ resource_id: resource.id });
    const conflict = existing.find(a =>
      a.status !== 'cancelled' &&
      a.job_id !== job.id &&
      new Date(a.start_datetime) < end &&
      new Date(a.end_datetime) > start
    );
    if (conflict) {
      setConflictWarning({ resource, conflict, start, end });
      setSaving(false);
      return;
    }
    setConflictWarning(null);

    await base44.entities.ResourceAssignment.create({
      job_id: job.id,
      resource_id: resource.id,
      slot_label: 'Additional resource',
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      status: 'confirmed',
      assigned_at: new Date().toISOString(),
    });
    setShowAddSearch(false);
    setSearch('');
    setSaving(false);
    loadData();
    onUpdated?.();
  };

  const activeAssignments = assignments.filter(a => a.status !== 'cancelled');
  const requiredSlots = template?.required_resources?.filter(r => r.is_required) || [];
  const filledLabels = new Set(activeAssignments.map(a => a.slot_label));
  const missingRequired = requiredSlots.filter(s => !filledLabels.has(s.slot_label));

  const filtered = allResources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) &&
    !activeAssignments.find(a => a.resource_id === r.id)
  );

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Resources</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddSearch(s => !s)}>
          <Plus className="w-3 h-3" /> Add resource
        </Button>
      </div>

      {/* Missing required slots warnings */}
      {missingRequired.map(s => (
        <div key={s.slot_label} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span><strong>{s.slot_label}</strong> — required resource not assigned</span>
        </div>
      ))}

      {activeAssignments.length === 0 && missingRequired.length === 0 && (
        <p className="text-xs text-slate-400">No resources assigned.</p>
      )}

      <div className="space-y-2">
        {activeAssignments.map(a => {
          const resource = resources[a.resource_id];
          if (!resource) return null;
          const Icon = TYPE_ICONS[resource.resource_type] || User;
          const isRequired = requiredSlots.some(s => s.slot_label === a.slot_label);
          return (
            <div key={a.id} className="flex items-center gap-2.5 text-sm">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: resource.colour || '#94A3B8' }} />
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-800">{resource.name}</span>
                {a.slot_label && <span className="text-xs text-slate-400 ml-1.5">· {a.slot_label}</span>}
                <div className="text-xs text-slate-400">
                  {fmtTime(a.start_datetime)} – {fmtTime(a.end_datetime)}
                </div>
              </div>
              <ResourceTypeBadge type={resource.resource_type} />
              {!isRequired && (
                <button onClick={() => handleRemove(a)} className="text-slate-300 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {conflictWarning && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg px-3 py-2.5 space-y-2">
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold">Scheduling conflict detected</p>
              <p className="mt-0.5">{conflictWarning.resource.name} is already booked from {fmtTime(conflictWarning.conflict.start_datetime)} to {fmtTime(conflictWarning.conflict.end_datetime)}.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleAddForce}>
              Assign anyway
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setConflictWarning(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAddSearch && (
        <div className="border rounded-lg p-2 space-y-1.5 bg-slate-50">
          <input
            autoFocus
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search resources…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(r => {
              const Icon = TYPE_ICONS[r.resource_type] || User;
              return (
                <button key={r.id} onClick={() => handleAdd(r)} disabled={saving}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-white rounded transition-colors text-left">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.colour || '#94A3B8' }} />
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1">{r.name}</span>
                  <ResourceTypeBadge type={r.resource_type} />
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-slate-400 px-2 py-1">No matching resources</p>}
          </div>
        </div>
      )}
    </div>
  );
}