import { Link, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Settings, Users, Clock } from 'lucide-react';

const TABS = [
  { path: '/seller/settings', label: 'General', TabIcon: Settings },
  { path: '/settings/resources', label: 'Resources', TabIcon: Users },
  { path: '/settings/appointment-templates', label: 'Appointment Templates', TabIcon: Clock },
];

export default function SellerSettings() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account, resources, and appointment templates</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ path, label, TabIcon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        General account settings are managed through your profile. Use the tabs above to manage resources and templates.
      </div>
    </div>
  );
}