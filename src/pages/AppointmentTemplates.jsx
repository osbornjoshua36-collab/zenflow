import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import AppointmentTemplateForm from '@/components/resources/AppointmentTemplateForm';

function formatDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function AppointmentTemplates() {
  const [business, setBusiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      const biz = bizList[0] || null;
      setBusiness(biz);
      if (biz) await loadTemplates(biz.id);
      setLoading(false);
    })();
  }, []);

  const loadTemplates = async (bizId) => {
    const t = await base44.entities.AppointmentTemplate.filter({ business_id: bizId }, '-created_date', 100);
    setTemplates(t);
  };

  const handleToggle = async (t) => {
    await base44.entities.AppointmentTemplate.update(t.id, { is_active: !t.is_active });
    loadTemplates(business.id);
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await base44.entities.AppointmentTemplate.delete(t.id);
    loadTemplates(business.id);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (showForm) return (
    <AppointmentTemplateForm
      template={editingTemplate}
      business={business}
      onClose={() => { setShowForm(false); setEditingTemplate(null); }}
      onSaved={() => { setShowForm(false); setEditingTemplate(null); loadTemplates(business?.id); }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointment Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define service types with resource requirements and durations</p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No appointment templates yet</p>
          <p className="text-sm mt-1">Create templates to define resource requirements for each service type</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {templates.map(t => (
            <div key={t.id} className={`flex items-center gap-4 px-5 py-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.colour || '#3B82F6' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">{t.name}</span>
                  {t.service_category && <span className="text-xs text-slate-500">· {t.service_category}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>{formatDuration(t.default_duration_minutes)}</span>
                  {(t.buffer_minutes_before > 0 || t.buffer_minutes_after > 0) && (
                    <span>+{t.buffer_minutes_before || 0}min before / {t.buffer_minutes_after || 0}min after</span>
                  )}
                  {t.required_resources?.length > 0 && (
                    <span>{t.required_resources.length} resource slot{t.required_resources.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <Switch checked={!!t.is_active} onCheckedChange={() => handleToggle(t)} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingTemplate(t); setShowForm(true); }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(t)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}