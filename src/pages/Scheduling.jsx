import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Scheduling() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobsData = await base44.entities.Job.list('-scheduled_date', 50);
        const customersData = await base44.entities.Customer.list('-created_date', 100);
        
        const customersMap = {};
        customersData.forEach(c => {
          customersMap[c.id] = c;
        });

        setJobs(jobsData);
        setCustomers(customersMap);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchData();
  }, []);

  const scheduled = jobs.filter(j => j.status === 'Scheduled');
  const inProgress = jobs.filter(j => j.status === 'In Progress');
  const completed = jobs.filter(j => j.status === 'Completed');

  const StatusBadge = ({ status }) => {
    const colors = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-amber-100 text-amber-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'No-Show': 'bg-gray-100 text-gray-800',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  const JobCard = ({ job }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{job.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {customers[job.customer_id]?.name || 'Unknown'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Tech: {job.technician_name}</p>
            <p className="text-sm text-slate-500">Estimated: {job.estimated_duration_hours}h</p>
          </div>
          <div className="text-right">
            <StatusBadge status={job.status} />
            <p className="text-xs text-slate-500 mt-2">
              {new Date(job.scheduled_date).toLocaleDateString()}
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              ${job.estimated_cost || 0}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline">
            Update Status
          </Button>
          <Button size="sm" variant="outline">
            Send Reminder
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduled.length === 0 ? (
            <p className="text-slate-500">No scheduled jobs</p>
          ) : (
            scheduled.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {inProgress.length === 0 ? (
            <p className="text-slate-500">No jobs in progress</p>
          ) : (
            inProgress.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length === 0 ? (
            <p className="text-slate-500">No completed jobs</p>
          ) : (
            completed.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>

      <Button className="w-full bg-blue-600 hover:bg-blue-700">
        Schedule New Job
      </Button>
    </div>
  );
}