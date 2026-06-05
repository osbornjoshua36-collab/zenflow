import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, User, Building, Wrench, Truck, Users } from 'lucide-react';
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge';

const TYPE_ICONS = { staff: User, space: Building, equipment: Wrench, vehicle: Truck, team: Users };

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ResourceList({ groups, showRoleFilter, onEdit, onRefresh }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const allResources = groups.flatMap(g => g.resources);
  const allRoles = [...new Set(allResources.map(r => r.role).filter(Boolean))];

  const handleToggleActive = async (resource) => {
    await base44.entities.Resource.update(resource.id, { is_active: !resource.is_active });
    onRefresh();
  };

  const handleDelete = async (resource) => {
    const assignments = await base44.entities.ResourceAssignment.filter({ resource_id: resource.id });
    const future = assignments.filter(a => a.status !== 'cancelled' && new Date(a.end_datetime) > new Date());
    if (future.length > 0) {
      alert(`This resource has ${future.length} upcoming booking(s). Deactivate it instead to remove it from future scheduling.`);
      return;
    }
    if (!window.confirm(`Delete "${resource.name}"? This cannot be undone.`)) return;
    setDeleting(resource.id);
    await base44.entities.Resource.delete(resource.id);
    setDeleting(null);
    onRefresh();
  };

  const filteredGroups = groups.map(g => ({
    ...g,
    resources: roleFilter === 'all' ? g.resources : g.resources.filter(r => r.role === roleFilter),
  }));

  return (
    <div className="space-y-6">
      {showRoleFilter && allRoles.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filter by role:</span>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredGroups.map(({ label, resources }) => {
        if (resources.length === 0) return null;
        return (
          <div key={label} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b">
              <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
            </div>
            <div className="divide-y">
              {resources.map(r => {
                const Icon = TYPE_ICONS[r.resource_type] || User;
                const days = (r.working_days || [1,2,3,4,5]).map(d => DAY_LABELS[d]).join(', ');
                return (
                  <div key={r.id} className={`flex items-center gap-4 px-5 py-3 ${!r.is_active ? 'opacity-50' : ''}`}>
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: r.colour || '#3B82F6' }} />
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-sm">{r.name}</span>
                        {r.role && <span className="text-xs text-slate-500">· {r.role}</span>}
                        <ResourceTypeBadge type={r.resource_type} />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {r.working_hours_start || '08:00'} – {r.working_hours_end || '17:00'} · {days}
                      </div>
                    </div>
                    <Switch checked={!!r.is_active} onCheckedChange={() => handleToggleActive(r)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(r)}
                      disabled={deleting === r.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredGroups.every(g => g.resources.length === 0) && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">No resources found.</p>
        </div>
      )}
    </div>
  );
}