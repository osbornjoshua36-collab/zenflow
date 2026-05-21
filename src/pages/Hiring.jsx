import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Hiring() {
  const [applicants, setApplicants] = useState([]);
  const [postings, setPostings] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const applicantsData = await base44.entities.Applicant.list('-created_date', 50);
        const postingsData = await base44.entities.JobPosting.list('-created_date', 20);
        
        setApplicants(applicantsData);
        setPostings(postingsData);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  const screening = applicants.filter(a => a.status === 'Screening');
  const qualified = applicants.filter(a => a.status === 'Qualified');
  const scheduled = applicants.filter(a => a.status === 'Interview Scheduled');
  const hired = applicants.filter(a => a.status === 'Hired');

  const StatusBadge = ({ status }) => {
    const colors = {
      'New': 'bg-gray-100 text-gray-800',
      'Screening': 'bg-blue-100 text-blue-800',
      'Qualified': 'bg-green-100 text-green-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800',
      'Hired': 'bg-emerald-100 text-emerald-800',
      'Rejected': 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  const ApplicantCard = ({ applicant }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{applicant.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{applicant.phone}</p>
            <p className="text-sm text-slate-500 mt-1">
              {applicant.experience_level}
            </p>
            {applicant.ai_assessment && (
              <p className="text-sm text-slate-600 mt-2 italic">
                {applicant.ai_assessment}
              </p>
            )}
          </div>
          <StatusBadge status={applicant.status} />
        </div>
        <div className="mt-4 flex gap-2">
          {applicant.status === 'Screening' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Mark Qualified
              </Button>
              <Button size="sm" variant="outline">
                Reject
              </Button>
            </>
          )}
          {applicant.status === 'Qualified' && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              Schedule Interview
            </Button>
          )}
          {applicant.status === 'Interview Scheduled' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              Make Offer
            </Button>
          )}
          <Button size="sm" variant="outline">
            View Conversation
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Job Postings */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Active Job Postings ({postings.filter(p => p.status === 'Active').length})</h3>
        <div className="space-y-2 mb-6">
          {postings.filter(p => p.status === 'Active').map(posting => (
            <Card key={posting.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{posting.title}</p>
                    <p className="text-xs text-slate-500">{posting.applicant_count} applicants</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Applicants Pipeline */}
      <Tabs defaultValue="screening" className="w-full">
        <TabsList>
          <TabsTrigger value="screening">Screening ({screening.length})</TabsTrigger>
          <TabsTrigger value="qualified">Qualified ({qualified.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Interview Scheduled ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="hired">Hired ({hired.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="screening" className="space-y-4">
          {screening.length === 0 ? (
            <p className="text-slate-500">No applicants in screening</p>
          ) : (
            screening.map(app => (
              <ApplicantCard key={app.id} applicant={app} />
            ))
          )}
        </TabsContent>

        <TabsContent value="qualified" className="space-y-4">
          {qualified.length === 0 ? (
            <p className="text-slate-500">No qualified applicants</p>
          ) : (
            qualified.map(app => (
              <ApplicantCard key={app.id} applicant={app} />
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduled.length === 0 ? (
            <p className="text-slate-500">No interviews scheduled</p>
          ) : (
            scheduled.map(app => (
              <ApplicantCard key={app.id} applicant={app} />
            ))
          )}
        </TabsContent>

        <TabsContent value="hired" className="space-y-4">
          {hired.length === 0 ? (
            <p className="text-slate-500">No hires yet</p>
          ) : (
            hired.map(app => (
              <ApplicantCard key={app.id} applicant={app} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Button className="w-full bg-blue-600 hover:bg-blue-700">
        Post New Job
      </Button>
    </div>
  );
}