import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreVertical, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import JobChecklist from '@/components/jobs/JobChecklist';
import JobPhotos from '@/components/jobs/JobPhotos';
import JobActivityLog from '@/components/jobs/JobActivityLog';
import JobRightPanel from '@/components/jobs/JobRightPanel';
import JobFooterActions from '@/components/jobs/JobFooterActions';
import JobStatusModals from '@/components/jobs/JobStatusModals';
import InvoiceCreate from '@/components/InvoiceCreate';
import { addActivityEntry } from '@/utils/jobUtils';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  Scheduled: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-orange-100 text-orange-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-700',
  'No-Show': 'bg-slate-100 text-slate-600',
};

const SCHEDULING_COLORS = {
  awaiting_proposal: 'bg-yellow-100 text-yellow-800',
  proposed: 'bg-blue-50 text-blue-600',
  confirmed: 'bg-green-50 text-green-700',
  completed: 'bg-slate-100 text-slate-500',
};

const JOB_TYPES = ['residential', 'commercial', 'emergency'];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [quote, setQuote] = useState(null);
  const [review, setReview] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'start' | 'complete' | 'cancel' | 'no-show'
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const loadJob = async () => {
    const [jobs] = await Promise.all([
      base44.entities.Job.filter({ id }),
    ]);
    const j = jobs[0];
    if (!j) { navigate('/scheduling'); return; }
    setJob(j);
    setTitleDraft(j.title);

    const [custs, invs, quotes, revs, profs, me] = await Promise.all([
      j.customer_id ? base44.entities.Customer.filter({ id: j.customer_id }) : Promise.resolve([]),
      base44.entities.Invoice.filter({ job_id: j.id }),
      base44.entities.Quote.filter({ converted_job_id: j.id }),
      base44.entities.Review.filter({ job_id: j.id }),
      base44.entities.CalendarProfile.list(),
      base44.auth.me(),
    ]);
    setCustomer(custs[0] || null);
    setInvoice(invs[0] || null);
    setQuote(quotes[0] || null);
    setReview(revs[0] || null);
    setProfiles(profs);

    if (me) {
      const biz = await base44.entities.Business.filter({ owner_email: me.email });
      setBusiness(biz[0] || null);
    }
    setLoading(false);
  };

  useEffect(() => { loadJob(); }, [id]);

  // Persist a field update + optionally log activity
  const update = async (fields) => {
    await base44.entities.Job.update(id, fields);
    setJob((prev) => ({ ...prev, ...fields }));
  };

  const updateWithActivity = async (fields, event_type, description, actor = 'seller') => {
    const newActivity = addActivityEntry(job.job_activity, event_type, description, actor);
    const merged = { ...fields, job_activity: newActivity };
    await base44.entities.Job.update(id, merged);
    setJob((prev) => ({ ...prev, ...merged }));
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === job.title) { setEditingTitle(false); return; }
    await update({ title: titleDraft.trim() });
    setEditingTitle(false);
  };

  // Notify buyer helper
  const notifyBuyer = async (message) => {
    if (!job.business_id) return;
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message,
      type: 'job_update',
      related_entity_id: id,
    });
  };

  const handleAction = (action) => {
    if (action === 'start') setModal('start');
    else if (action === 'complete') setModal('complete');
    else if (action === 'reschedule') {
      // re-open scheduling queue on scheduling page
      navigate('/scheduling');
    } else if (action === 'create_invoice' || action === 'add_photos') {
      if (action === 'create_invoice') setShowCreateInvoice(true);
    } else if (action === 'reactivate') {
      updateWithActivity({ status: 'Scheduled', cancelled_at: null, cancelled_by: null }, 'job_reactivated', 'Job reactivated', 'seller');
      toast({ title: 'Job reactivated.' });
    }
  };

  const handleConfirmAction = async (action, data) => {
    const category = job.service_category || job.title;
    const bizName = business?.business_name || 'the business';

    if (action === 'start') {
      await updateWithActivity(
        { status: 'In Progress', started_at: new Date().toISOString() },
        'job_started',
        'Job marked as started',
        'seller'
      );
      await notifyBuyer(
        `${bizName} has started your ${category} job. Track progress in your dashboard.`
      );
    } else if (action === 'complete') {
      const fields = {
        status: 'Completed',
        scheduling_status: 'completed',
        completed_at: new Date().toISOString(),
        actual_cost: data.actual_cost,
      };
      await updateWithActivity(fields, 'job_completed', `Job marked as completed. Final cost: $${data.actual_cost}`, 'seller');
      await notifyBuyer(
        `Your ${category} job with ${bizName} is complete. Please confirm completion in your dashboard to release payment.`
      );
    } else if (action === 'cancel') {
      await updateWithActivity(
        {
          status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: data.cancellation_reason,
          cancelled_by: 'seller',
        },
        'job_cancelled',
        `Job cancelled. Reason: ${data.cancellation_reason}`,
        'seller'
      );
      await notifyBuyer(
        `Your ${category} booking with ${bizName} has been cancelled. Reason: ${data.cancellation_reason}.`
      );
    } else if (action === 'no-show') {
      await updateWithActivity(
        { status: 'No-Show', no_show_recorded_at: new Date().toISOString() },
        'no_show_recorded',
        'No-show recorded',
        'seller'
      );
      await notifyBuyer(
        `We missed you for your ${category} appointment today. Please contact ${bizName} to reschedule.`
      );
    }

    setModal(null);
  };

  const handleSendReminder = async () => {
    if (!customer) return;
    const category = job.service_category || job.title;
    const dateStr = job.scheduled_date
      ? new Date(job.scheduled_date).toLocaleString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
      : 'your scheduled time';
    const bizName = business?.business_name || 'the business';
    const msg = `Reminder: You have a ${category} appointment with ${bizName} on ${dateStr}.${customer.address ? ` Address: ${customer.address}.` : ''}`;

    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: msg,
      type: 'job_update',
      related_entity_id: id,
    });
    await updateWithActivity({}, 'reminder_sent', `Reminder sent to ${customer.name}`, 'seller');
    toast({ title: `Reminder sent to ${customer.name}` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) return null;

  if (showCreateInvoice) {
    return (
      <InvoiceCreate
        businessId={job.business_id}
        prefill={{ customer_id: job.customer_id, job_id: job.id, amount: job.actual_cost || job.estimated_cost }}
        onClose={() => { setShowCreateInvoice(false); loadJob(); }}
      />
    );
  }

  return (
    <div className="pb-20">
      {/* Back nav */}
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Inline title edit */}
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  className="text-lg font-bold h-9"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
                <button onClick={saveTitle}><Check className="w-4 h-4 text-green-500" /></button>
                <button onClick={() => setEditingTitle(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                  onClick={() => setEditingTitle(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={STATUS_COLORS[job.status]}>{job.status}</Badge>
              {job.scheduling_status && (
                <Badge className={SCHEDULING_COLORS[job.scheduling_status] || 'bg-slate-100 text-slate-500'}>
                  {job.scheduling_status.replace('_', ' ')}
                </Badge>
              )}
              {customer && (
                <span className="text-sm text-slate-500">{customer.name}</span>
              )}
            </div>
            {job.scheduled_date && (
              <p className="text-sm text-slate-500 mt-1">
                {new Date(job.scheduled_date).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            )}
          </div>

          {/* Ellipsis menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setModal('cancel')} className="text-red-600">
                Cancel job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setModal('no-show')} className="text-slate-600">
                Mark no-show
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Job details */}
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 border-b pb-2">Job Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Service Category</label>
                <Input
                  value={job.service_category || ''}
                  onChange={(e) => update({ service_category: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="e.g. AC Repair"
                  onBlur={(e) => update({ service_category: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Job Type</label>
                <Select value={job.job_type || 'residential'} onValueChange={(v) => update({ job_type: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Technician</label>
                <Select
                  value={job.technician_name || ''}
                  onValueChange={(v) => update({ technician_name: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.technician_name}>
                        {p.name} ({p.technician_name})
                      </SelectItem>
                    ))}
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Duration (hrs)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={job.estimated_duration_hours || ''}
                  onChange={(e) => update({ estimated_duration_hours: parseFloat(e.target.value) || 1 })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Estimated Cost ($)</label>
                <Input
                  type="number"
                  value={job.estimated_cost || ''}
                  onChange={(e) => update({ estimated_cost: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Actual Cost ($)</label>
                <Input
                  type="number"
                  value={job.actual_cost || ''}
                  onChange={(e) => update({ actual_cost: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm"
                  placeholder="Set when complete"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Internal notes <span className="text-slate-400">(Private — not visible to customer)</span>
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                value={job.notes_internal || job.notes || ''}
                onChange={(e) => update({ notes_internal: e.target.value })}
                placeholder="Private notes…"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Shared notes <span className="text-slate-400">(Shared with customer)</span>
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                value={job.notes_shared || ''}
                onChange={(e) => update({ notes_shared: e.target.value })}
                placeholder="Customer-visible notes…"
              />
            </div>
          </div>

          {/* Scheduling section */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 border-b pb-2">Scheduling</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={job.scheduled_date ? job.scheduled_date.slice(0, 10) : ''}
                  onChange={(e) => {
                    const t = job.scheduled_date
                      ? job.scheduled_date.slice(11, 16)
                      : '08:00';
                    update({ scheduled_date: new Date(`${e.target.value}T${t}`).toISOString() });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Time</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={job.scheduled_date ? job.scheduled_date.slice(11, 16) : ''}
                  onChange={(e) => {
                    const d = job.scheduled_date
                      ? job.scheduled_date.slice(0, 10)
                      : new Date().toISOString().slice(0, 10);
                    update({ scheduled_date: new Date(`${d}T${e.target.value}`).toISOString() });
                  }}
                />
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium">Scheduling status:</span>{' '}
              <Badge className={SCHEDULING_COLORS[job.scheduling_status] || 'bg-slate-100 text-slate-500'}>
                {(job.scheduling_status || 'not set').replace('_', ' ')}
              </Badge>
            </div>
            {(job.proposed_dates || []).length > 0 && job.scheduling_status === 'proposed' && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Proposed times (awaiting buyer):</p>
                {job.proposed_dates.map((d, i) => (
                  <p key={i} className="text-sm text-slate-600">• {new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                ))}
              </div>
            )}
            {job.confirmed_date && job.scheduling_status === 'confirmed' && (
              <p className="text-sm text-green-700 font-medium">
                ✅ Confirmed for {new Date(job.confirmed_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl border p-4">
            <JobChecklist
              job={job}
              onUpdate={update}
              onUpdateWithActivity={updateWithActivity}
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl border p-4">
            <JobPhotos
              job={job}
              onUpdate={update}
              onActivity={(desc) =>
                updateWithActivity({}, 'photos_added', desc, 'seller')
              }
            />
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-xl border p-4">
            <JobActivityLog job={job} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <JobRightPanel
            job={job}
            customer={customer}
            invoice={invoice}
            quote={quote}
            review={review}
            onCreateInvoice={() => setShowCreateInvoice(true)}
            onSendReminder={handleSendReminder}
          />
        </div>
      </div>

      {/* Footer action bar */}
      <JobFooterActions job={job} invoice={invoice} onAction={handleAction} />

      {/* Status modals */}
      {modal && (
        <JobStatusModals
          job={job}
          modal={modal}
          onClose={() => setModal(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}