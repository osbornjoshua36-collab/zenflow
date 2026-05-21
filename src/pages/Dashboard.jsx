import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LeadsPipeline from '@/components/LeadsPipeline';
import AppointmentCalendar from '@/components/AppointmentCalendar';

export default function Dashboard() {
  const [stats, setStats] = useState({
    leads_this_month: 0,
    jobs_scheduled: 0,
    invoices_pending: 0,
    reviews_this_month: 0,
    applicants_qualified: 0,
    revenue_pending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [jobs, invoices, messages, applicants] = await Promise.all([
          base44.entities.Job.list('-created_date', 100),
          base44.entities.Invoice.list('-created_date', 100),
          base44.entities.Message.list('-created_date', 100),
          base44.entities.Applicant.list('-created_date', 100),
        ]);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        setStats({
          leads_this_month: messages.filter(m => {
            const d = new Date(m.created_date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length,
          jobs_scheduled: jobs.filter(j => j.status === 'Scheduled').length,
          invoices_pending: invoices.filter(i => i.status === 'Sent' || i.status === 'Viewed').length,
          reviews_this_month: 0,
          applicants_qualified: applicants.filter(a => a.status === 'Qualified').length,
          revenue_pending: invoices
            .filter(i => i.status === 'Sent' || i.status === 'Viewed' || i.status === 'Overdue')
            .reduce((sum, inv) => sum + inv.amount, 0),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const data = [
    { name: 'Leads', value: stats.leads_this_month },
    { name: 'Jobs', value: stats.jobs_scheduled },
    { name: 'Invoices', value: stats.invoices_pending },
    { name: 'Reviews', value: stats.reviews_this_month },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.leads_this_month}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Jobs Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.jobs_scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Revenue Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">${stats.revenue_pending.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Appointment Calendar */}
      <AppointmentCalendar />

      {/* Leads Pipeline */}
      <LeadsPipeline />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoices Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoices_pending}</div>
            <p className="text-xs text-slate-500 mt-2">${stats.revenue_pending.toFixed(0)} awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hiring Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applicants_qualified}</div>
            <p className="text-xs text-slate-500 mt-2">Qualified applicants ready to interview</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}