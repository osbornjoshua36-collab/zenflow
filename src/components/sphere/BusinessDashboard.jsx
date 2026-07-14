import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LeadsPipeline from '@/components/LeadsPipeline';
import AppointmentCalendar from '@/components/AppointmentCalendar';
import { Briefcase, Receipt, Users, Tag, Star, Inbox, Boxes, Settings, Package, ShoppingCart } from 'lucide-react';

const SERVICES_LINKS = [
  { path: '/scheduling', icon: Briefcase, label: 'Jobs' },
  { path: '/finance', icon: Receipt, label: 'Finance' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/seller/listings', icon: Tag, label: 'Listings' },
  { path: '/reputation', icon: Star, label: 'Reviews' },
  { path: '/leads', icon: Inbox, label: 'Leads' },
  { path: '/settings/resources', icon: Boxes, label: 'Resources' },
  { path: '/seller/settings', icon: Settings, label: 'Settings' },
];

const PRODUCTS_LINKS = [
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/finance', icon: Receipt, label: 'Finance' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/reputation', icon: Star, label: 'Reviews' },
  { path: '/seller/settings', icon: Settings, label: 'Settings' },
];

export default function BusinessDashboard() {
  const [stats, setStats] = useState({ leads: 0, jobs: 0, invoices: 0, revenue: 0, applicants: 0 });
  const [businessType, setBusinessType] = useState('services');
  const QUICK_LINKS = businessType === 'products' ? PRODUCTS_LINKS : SERVICES_LINKS;

  useEffect(() => {
    (async () => {
      try {
        const [jobs, invoices, messages, applicants] = await Promise.all([
          base44.entities.Job.list('-created_date', 100),
          base44.entities.Invoice.list('-created_date', 100),
          base44.entities.Message.list('-created_date', 100),
          base44.entities.Applicant.list('-created_date', 100),
        ]);
        const now = new Date();
        setStats({
          leads: messages.filter(m => { const d = new Date(m.created_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
          jobs: jobs.filter(j => j.status === 'Scheduled').length,
          invoices: invoices.filter(i => i.status === 'Sent' || i.status === 'Viewed').length,
          revenue: invoices.filter(i => i.status === 'Sent' || i.status === 'Viewed' || i.status === 'Overdue').reduce((s, inv) => s + (inv.amount || 0), 0),
          applicants: applicants.filter(a => a.status === 'Qualified').length,
        });
      } catch (e) { console.error('Error fetching stats:', e); }
      try {
        const bizList = await base44.entities.Business.list('-created_date', 1);
        if (bizList[0]?.business_type) setBusinessType(bizList[0].business_type);
      } catch {}
    })();
  }, []);

  const chartData = [
    { name: 'Leads', value: stats.leads },
    { name: 'Jobs', value: stats.jobs },
    { name: 'Invoices', value: stats.invoices },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>🏢 My Business</h2>
        <p className="text-sm text-muted-foreground mt-0.5">your business at a glance</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map(link => {
          const Icon = link.icon;
          return (
            <Link key={link.path} to={link.path} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors">
              <Icon className="w-3.5 h-3.5" /> {link.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Leads This Month</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-slate-900">{stats.leads}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Jobs Scheduled</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{stats.jobs}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Revenue Pending</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">${stats.revenue.toFixed(0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity Overview</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {businessType === 'services' && <AppointmentCalendar />}
      {businessType === 'services' && <LeadsPipeline />}
    </div>
  );
}