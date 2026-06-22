import { useState } from 'react';
import AppointmentCalendar from '@/components/AppointmentCalendar';
import ResourceScheduleView from '@/components/ResourceScheduleView';

const TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'resources', label: 'Resource Availability' },
];

export default function Scheduling() {
  const [activeTab, setActiveTab] = useState('calendar');

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
      {activeTab === 'calendar' && <AppointmentCalendar />}
      {activeTab === 'resources' && <ResourceScheduleView />}
    </div>
  );
}