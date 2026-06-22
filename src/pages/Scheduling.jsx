import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppointmentCalendar from '@/components/AppointmentCalendar';
import ResourceScheduleView from '@/components/ResourceScheduleView';
import JobPipelineView from '@/components/jobs/JobPipelineView';

const TABS = [
  { id: 'pipeline', label: 'Job Pipeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'resources', label: 'Resource Availability' },
];

export default function Scheduling() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) return;
      const biz = await base44.entities.Business.filter({ owner_email: me.email });
      if (biz[0]) setBusinessId(biz[0].id);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'pipeline' && <JobPipelineView businessId={businessId} />}
      {activeTab === 'calendar' && <AppointmentCalendar />}
      {activeTab === 'resources' && <ResourceScheduleView />}
    </div>
  );
}