import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isAfter, isSameDay, addDays } from 'date-fns';
import { Calendar, Clock, AlertTriangle, User, ChevronRight, X, CheckCircle, RefreshCw, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StaffScheduleEditor from '@/components/staff/StaffScheduleEditor';
import StaffJobActionDialog from '@/components/staff/StaffJobActionDialog';

export default function StaffPortal() {
  const [me, setMe] = useState(null);
  const [myResource, setMyResource] = useState(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const user = await base44.auth.me();
      setMe(user);

      // Find the Resource record linked to this user by email
      const resources = await base44.asServiceRole.entities.Resource.filter({
        resource_type: 'staff',
        user_email: user.email,
      });
      const matched = resources[0];

      if (!matched) {
        setError('No staff profile found for your account. Please contact your manager.');
        setLoading(false);
        return;
      }
      setMyResource(matched);

      // Load upcoming assignments for this resource
      const assignments = await base44.asServiceRole.entities.ResourceAssignment.filter({
        resource_id: matched.id,
        status: 'confirmed',
      });

      const now = new Date();
      const future = assignments.filter(a => isAfter(new Date(a.end_datetime), now));
      setUpcomingAssignments(future);

      // Load job details
      const jobIds = [...new Set(future.map(a => a.job_id))];
      if (jobIds.length > 0) {
        const jobResults = await Promise.all(jobIds.map(id => base44.asServiceRole.entities.Job.filter({ id })));
        const jobMap = {};
        jobResults.flat().forEach(j => { jobMap[j.id] = j; });
        setJobs(jobMap);
      }

      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const getExceptionForDate = (date) => {
    return myResource?.availability_exceptions?.find(ex => isSameDay(parseISO(ex.date), date));
  };

  const todayAssignments = upcomingAssignments.filter(a =>
    isSameDay(new Date(a.start_datetime), new Date())
  );
  const futureAssignments = upcomingAssignments.filter(a =>
    !isSameDay(new Date(a.start_datetime), new Date())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center p-6 bg-white border rounded-xl">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-800">{error}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-fraunces font-semibold text-slate-900">My Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">{myResource?.role || 'Staff'} · {me?.full_name}</p>
        </div>
        {myResource?.can_block_own_calendar ? (
          <Button
            onClick={() => setShowScheduleEditor(true)}
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <Calendar className="w-4 h-4" />
            Edit Availability
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 border rounded-lg px-3 py-2 bg-slate-50 cursor-not-allowed">
            <Calendar className="w-3.5 h-3.5" />
            <span>Owner managed</span>
          </div>
        )}
      </div>

      {/* Availability exceptions banner */}
      {myResource?.availability_exceptions?.filter(ex =>
        isAfter(parseISO(ex.date), addDays(new Date(), -1))
      ).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Upcoming Availability Changes
          </p>
          {myResource.availability_exceptions
            .filter(ex => isAfter(parseISO(ex.date), addDays(new Date(), -1)))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">
                  {format(parseISO(ex.date), 'EEEE, MMM d')} —{' '}
                  {ex.is_available === false
                    ? <span className="font-medium text-red-600">Not available ({ex.reason || 'Out of office'})</span>
                    : <span className="text-amber-700">Modified hours: {ex.working_hours_start}–{ex.working_hours_end}</span>
                  }
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Today's work */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Today</h2>
        {todayAssignments.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-400 text-sm">
            No assignments scheduled for today.
          </div>
        ) : (
          <div className="space-y-3">
            {todayAssignments.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                job={jobs[a.job_id]}
                resource={myResource}
                onAction={() => setSelectedAssignment(a)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {futureAssignments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="space-y-3">
            {futureAssignments
              .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
              .map(a => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  job={jobs[a.job_id]}
                  resource={myResource}
                  onAction={() => setSelectedAssignment(a)}
                />
              ))}
          </div>
        </section>
      )}

      {upcomingAssignments.length === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-sm">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No upcoming assignments. Enjoy your free time!
        </div>
      )}

      {/* Schedule editor dialog */}
      {showScheduleEditor && (
        <StaffScheduleEditor
          resource={myResource}
          assignments={upcomingAssignments}
          jobs={jobs}
          onClose={() => setShowScheduleEditor(false)}
          onSaved={(updated) => {
            setMyResource(updated);
            setShowScheduleEditor(false);
          }}
        />
      )}

      {/* Job action dialog */}
      {selectedAssignment && (
        <StaffJobActionDialog
          assignment={selectedAssignment}
          job={jobs[selectedAssignment.job_id]}
          resource={myResource}
          onClose={() => setSelectedAssignment(null)}
          onSaved={() => {
            setSelectedAssignment(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AssignmentCard({ assignment, job, resource, onAction }) {
  const start = new Date(assignment.start_datetime);
  const end = new Date(assignment.end_datetime);
  const isToday = isSameDay(start, new Date());

  const statusColor = {
    Scheduled: 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-green-100 text-green-700',
    Completed: 'bg-slate-100 text-slate-500',
    Cancelled: 'bg-red-100 text-red-600',
  }[job?.status] || 'bg-slate-100 text-slate-500';

  return (
    <div className="bg-white border rounded-xl p-4 flex items-start gap-4">
      <div className="bg-slate-100 rounded-lg p-2 mt-0.5">
        <Clock className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-900 text-sm truncate">{job?.title || 'Job'}</p>
          {job?.status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {job.status}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {isToday ? '' : format(start, 'EEE, MMM d · ')}{format(start, 'h:mm a')} – {format(end, 'h:mm a')}
        </p>
        {assignment.slot_label && (
          <p className="text-xs text-slate-400 mt-0.5">{assignment.slot_label}</p>
        )}
      </div>
      {job?.status !== 'Completed' && job?.status !== 'Cancelled' && (
        <button
          onClick={onAction}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap mt-0.5"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}