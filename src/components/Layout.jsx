import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, MessageSquare, Calendar, CheckCircle, Star, DollarSign, Users, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout() {
  const location = useLocation();
  const modules = [
    { path: '/', icon: BarChart3, label: 'Dashboard' },
    { path: '/leads', icon: MessageSquare, label: 'Leads' },
    { path: '/scheduling', icon: Calendar, label: 'Scheduling' },
    { path: '/post-job', icon: CheckCircle, label: 'Post-Job' },
    { path: '/reputation', icon: Star, label: 'Reputation' },
    { path: '/invoicing', icon: DollarSign, label: 'Invoicing' },
    { path: '/hiring', icon: Users, label: 'Hiring' },
    { path: '/community', icon: Globe, label: 'Community Hub' },
  ];

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">ConnectOS</h1>
          <p className="text-xs text-slate-400 mt-1">AI Communication Platform</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = location.pathname === mod.path;
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{mod.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-8 py-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {modules.find(m => m.path === location.pathname)?.label || 'App'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}