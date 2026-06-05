import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ResourceList from '@/components/resources/ResourceList';
import ResourceFormDialog from '@/components/resources/ResourceFormDialog';
import TeamTab from '@/components/resources/TeamTab';

export default function ResourceManagement() {
  const [business, setBusiness] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      const biz = bizList[0] || null;
      setBusiness(biz);
      if (biz) await loadResources(biz.id);
      setLoading(false);
    })();
  }, []);

  const loadResources = async (bizId) => {
    const res = await base44.entities.Resource.filter({ business_id: bizId }, '-created_date', 200);
    setResources(res);
  };

  const handleEdit = (resource) => { setEditingResource(resource); setShowForm(true); };
  const handleAdd = () => { setEditingResource(null); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditingResource(null); if (business) loadResources(business.id); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  const byType = (type) => resources.filter(r => r.resource_type === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resources</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff, spaces, equipment, vehicles, and teams</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Resource
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="spaces">Spaces & Equipment</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ResourceList
            groups={[
              { label: 'Staff', resources: byType('staff') },
              { label: 'Spaces', resources: byType('space') },
              { label: 'Equipment', resources: byType('equipment') },
              { label: 'Vehicles', resources: byType('vehicle') },
              { label: 'Teams', resources: byType('team') },
            ]}
            onEdit={handleEdit}
            onRefresh={() => loadResources(business?.id)}
          />
        </TabsContent>

        <TabsContent value="staff">
          <ResourceList
            groups={[{ label: 'Staff', resources: byType('staff') }]}
            showRoleFilter
            onEdit={handleEdit}
            onRefresh={() => loadResources(business?.id)}
          />
        </TabsContent>

        <TabsContent value="spaces">
          <ResourceList
            groups={[
              { label: 'Spaces', resources: byType('space') },
              { label: 'Equipment', resources: byType('equipment') },
            ]}
            onEdit={handleEdit}
            onRefresh={() => loadResources(business?.id)}
          />
        </TabsContent>

        <TabsContent value="vehicles">
          <ResourceList
            groups={[{ label: 'Vehicles', resources: byType('vehicle') }]}
            onEdit={handleEdit}
            onRefresh={() => loadResources(business?.id)}
          />
        </TabsContent>

        <TabsContent value="teams">
          <TeamTab
            business={business}
            allResources={resources}
            onRefresh={() => loadResources(business?.id)}
          />
        </TabsContent>
      </Tabs>

      <ResourceFormDialog
        open={showForm}
        resource={editingResource}
        business={business}
        allResources={resources}
        onClose={() => { setShowForm(false); setEditingResource(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}