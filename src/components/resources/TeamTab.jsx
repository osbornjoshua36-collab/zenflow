import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, X, Users, Pencil, Trash2 } from 'lucide-react';
import ResourceTypeBadge from '@/components/resources/ResourceTypeBadge';

const PRESET_COLOURS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899','#14B8A6','#F97316'];

export default function TeamTab({ business, allResources, onRefresh }) {
  const [teams, setTeams] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState({ name: '', colour: '#3B82F6' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const nonTeamResources = allResources.filter(r => r.resource_type !== 'team' && r.is_active);

  useEffect(() => {
    const teamList = allResources.filter(r => r.resource_type === 'team');
    setTeams(teamList);
    if (teamList.length > 0) loadMemberships(teamList.map(t => t.id));
  }, [allResources]);

  const loadMemberships = async (teamIds) => {
    const all = [];
    for (const tid of teamIds) {
      const m = await base44.entities.TeamMember.filter({ team_resource_id: tid });
      all.push(...m);
    }
    setMemberships(all);
  };

  const getMembersForTeam = (teamId) => {
    const memberIds = memberships.filter(m => m.team_resource_id === teamId).map(m => m.member_resource_id);
    return allResources.filter(r => memberIds.includes(r.id));
  };

  const openCreate = () => {
    setEditingTeam(null);
    setForm({ name: '', colour: '#3B82F6' });
    setSelectedMembers([]);
    setShowDialog(true);
  };

  const openEdit = (team) => {
    setEditingTeam(team);
    setForm({ name: team.name, colour: team.colour || '#3B82F6' });
    setSelectedMembers(getMembersForTeam(team.id));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    let teamResource;
    if (editingTeam) {
      await base44.entities.Resource.update(editingTeam.id, { name: form.name, colour: form.colour });
      teamResource = { ...editingTeam, ...form };
      // Remove old memberships
      const old = memberships.filter(m => m.team_resource_id === editingTeam.id);
      for (const m of old) await base44.entities.TeamMember.delete(m.id);
    } else {
      teamResource = await base44.entities.Resource.create({
        business_id: business?.id,
        name: form.name,
        resource_type: 'team',
        colour: form.colour,
        is_active: true,
        working_hours_start: '08:00',
        working_hours_end: '17:00',
        working_days: [1,2,3,4,5],
      });
    }
    for (const member of selectedMembers) {
      await base44.entities.TeamMember.create({ team_resource_id: teamResource.id, member_resource_id: member.id });
    }
    setSaving(false);
    setShowDialog(false);
    onRefresh();
  };

  const handleDelete = async (team) => {
    const assignments = await base44.entities.ResourceAssignment.filter({ resource_id: team.id });
    const future = assignments.filter(a => a.status !== 'cancelled' && new Date(a.end_datetime) > new Date());
    if (future.length > 0) {
      alert(`This team has ${future.length} upcoming booking(s). Deactivate it instead.`);
      return;
    }
    if (!window.confirm(`Delete team "${team.name}"?`)) return;
    const mems = memberships.filter(m => m.team_resource_id === team.id);
    for (const m of mems) await base44.entities.TeamMember.delete(m.id);
    await base44.entities.Resource.delete(team.id);
    onRefresh();
  };

  const toggleMember = (r) => {
    setSelectedMembers(prev => prev.find(m => m.id === r.id) ? prev.filter(m => m.id !== r.id) : [...prev, r]);
  };

  const filtered = nonTeamResources.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Teams group multiple resources that are scheduled together.</p>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="w-3.5 h-3.5" /> Create team</Button>
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No teams yet. Create one to group resources.</div>
      )}

      <div className="space-y-3">
        {teams.map(team => {
          const members = getMembersForTeam(team.id);
          return (
            <div key={team.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: team.colour || '#3B82F6' }} />
                  <span className="font-semibold text-slate-900">{team.name}</span>
                  <span className="text-xs text-slate-400">{members.length} members</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(team)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(team)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: m.colour || '#94A3B8' }} />
                    {m.name}
                    <ResourceTypeBadge type={m.resource_type} />
                  </div>
                ))}
                {members.length === 0 && <span className="text-xs text-slate-400">No members yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={() => setShowDialog(false)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Crew A, Morning Team" />
            </div>
            <div>
              <Label className="mb-2 block">Colour</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLOURS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, colour: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.colour === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Members</Label>
              <Input placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {filtered.map(r => (
                  <button key={r.id} onClick={() => toggleMember(r)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${selectedMembers.find(m => m.id === r.id) ? 'bg-blue-50' : ''}`}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.colour || '#94A3B8' }} />
                    <span className="flex-1 text-left">{r.name}</span>
                    <ResourceTypeBadge type={r.resource_type} />
                    {selectedMembers.find(m => m.id === r.id) && <span className="text-blue-600 text-xs font-medium">✓</span>}
                  </button>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs">
                      {m.name}
                      <button onClick={() => toggleMember(m)}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : 'Save team'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}