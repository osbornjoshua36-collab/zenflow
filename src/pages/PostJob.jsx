import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PostJob() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const completed = await base44.entities.Job.filter({ status: 'Completed' }, '-created_date', 50);
        const customersData = await base44.entities.Customer.list('-created_date', 100);
        
        const customersMap = {};
        customersData.forEach(c => {
          customersMap[c.id] = c;
        });

        setJobs(completed);
        setCustomers(customersMap);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  const noSequenceStarted = jobs.filter(j => !j.post_job_sequence_started);
  const inProgress = jobs.filter(j => j.post_job_sequence_started && !j.post_job_sequence_completed);
  const completed = jobs.filter(j => j.post_job_sequence_completed);

  const SequenceCard = ({ job, status }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{job.title}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {customers[job.customer_id]?.name}
            </p>
            <div className="mt-3 text-sm">
              {status === 'pending' && <p className="text-amber-700">Awaiting sequence start</p>}
              {status === 'in-progress' && <p className="text-blue-700">Review request sent</p>}
              {status === 'completed' && <p className="text-green-700">Sequence complete</p>}
            </div>
          </div>
          <Button size="sm" variant="outline">
            {status === 'pending' ? 'Start Sequence' : 'View Status'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending ({noSequenceStarted.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {noSequenceStarted.length === 0 ? (
            <p className="text-slate-500">No pending post-job sequences</p>
          ) : (
            noSequenceStarted.map(job => (
              <SequenceCard key={job.id} job={job} status="pending" />
            ))
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {inProgress.length === 0 ? (
            <p className="text-slate-500">No sequences in progress</p>
          ) : (
            inProgress.map(job => (
              <SequenceCard key={job.id} job={job} status="in-progress" />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length === 0 ? (
            <p className="text-slate-500">No completed sequences</p>
          ) : (
            completed.map(job => (
              <SequenceCard key={job.id} job={job} status="completed" />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}