import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, ChevronUp, Inbox, Badge as BadgeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const STAGE_KEYS = ['lead', 'scheduled', 'completed', 'tasks', 'invoiced', 'paid'];
const STAGE_LABELS = {
  lead: 'Lead',
  scheduled: 'Scheduled',
  completed: 'Job Done',
  tasks: 'Tasks',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

function getStageStatuses(job, invoice) {
  const s = job.status;
  const isCancelled = s === 'Cancelled' || s === 'No-Show';
  const isScheduled = !!job.scheduled_date && (
    job.scheduling_status === 'confirmed' || s === 'Scheduled' || s === 'In Progress' || s === 'Completed'
  );
  const isCompleted = s === 'Completed';
  const checklist = job.checklist_items || [];
  const allTasksDone = checklist.length > 0 && checklist.every(i => i.is_complete);
  const noTasks = checklist.length === 0;
  const isInvoiced = !!invoice;
  const isPaid = invoice?.status === 'Paid';

  return {
    lead: 'done',
    scheduled: isCancelled ? 'skipped' : isScheduled ? 'done' : 'active',
    completed: isCancelled ? 'skipped' : isCompleted ? 'done' : s === 'In Progress' ? 'active' : 'pending',
    tasks: isCancelled ? 'skipped' : noTasks ? 'pending' : allTasksDone ? 'done' : isCompleted || s === 'In Progress' ? 'active' : 'pending',
    invoiced: isCancelled ? 'skipped' : isInvoiced ? 'done' : isCompleted ? 'active' : 'pending',
    paid: isCancelled ? 'skipped' : isPaid ? 'done' : isInvoiced ? 'active' : 'pending',
  };
}

function MiniStage({ status, label }) {
  const dot = (() => {
    if (status === 'done') return <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />;
    if (status === 'active') return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 ring-2 ring-blue-200" />;
    if (status === 'skipped') return <span className="w-2.5 h-2.5 rounded-full bg-slate-200 flex-shrink-0" />;
    return <span className="w-2.5 h-2.5 rounded-full border border-slate-200 flex-shrink-0" />;
  })();

  const labelColor = status === 'done'
    ? 'text-green-700'
    : status === 'active'
    ? 'text-blue-600 font-medium'
    : status === 'skipped'
    ? 'text-slate-300'
    : 'text-slate-400';

  return (
    <div className="flex flex-col items-center gap-1">
      {dot}
      <span className={`text-xs ${labelColor}`}>{label}</span>
    </div>
  );
}

const STATUS_PILL = {
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-orange-100 text-orange-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-600',
  'No-Show': 'bg-slate-100 text-slate-500',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'active', label: 'Active' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'needs_invoice', label: 'Needs Invoice' },
  { value: 'unpaid', label: 'Unpaid' },
];

function getJobCount(jobs, invoiceMap, value) {
  return jobs.filter(job => {
    if (value === 'all') return true;
    if (value === 'active') return job.status === 'Scheduled' || job.status === 'In Progress';
    if (value === 'needs_invoice') return job.status === 'Completed' && !invoiceMap[job.id];
    if (value === 'unpaid') {
      const inv = invoiceMap[job.id];
      return inv && inv.status !== 'Paid' && inv.status !== 'Cancelled';
    }
    return job.status === value;
  }).length;
}

// ─── Leads section ───────────────────────────────────────────────────────────

function LeadsSection() {
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    (async () => {
      const [msgs, custs] = await Promise.all([
        base44.entities.Message.list('-created_date', 50),
        base44.entities.Customer.list('-created_date', 100),
      ]);
      const cm = {};
      custs.forEach(c => { cm[c.id] = c; });
      setMessages(msgs);
      setCustomers(cm);
      setLoading(false);
    })();
  }, []);

  const inbound = messages.filter(m => m.direction === 'Inbound');
  const aiDrafted = messages.filter(m => m.ai_drafted && !m.approved_by);
  const responded = messages.filter(m => m.direction === 'Outbound');

  const tabs = [
    { id: 'all', label: 'All', items: inbound },
    { id: 'draft', label: 'AI Drafts', items: aiDrafted },
    { id: 'responded', label: 'Responded', items: responded },
  ];

  const activeItems = tabs.find(t => t.id === activeTab)?.items || [];

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Leads & Inbound Messages</span>
          {inbound.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              {inbound.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t">
          {/* Sub-tabs */}
          <div className="flex border-b px-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label} ({t.items.length})
              </button>
            ))}
          </div>

          {loading && (
            <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
          )}

          {!loading && activeItems.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">No messages here.</div>
          )}

          <div className="divide-y max-h-80 overflow-y-auto">
            {activeItems.map(msg => (
              <div key={msg.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {customers[msg.customer_id]?.name || 'Unknown'}
                    </p>
                    {msg.ai_drafted && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">AI Draft</span>
                    )}
                    {msg.channel && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{msg.channel}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{msg.content}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {msg.created_date ? format(new Date(msg.created_date), 'MMM d') : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobPipelineView({ businessId }) {
  const [jobs, setJobs] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [customerMap, setCustomerMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const allJobs = await base44.entities.Job.filter({ business_id: businessId }, '-scheduled_date', 100);
      setJobs(allJobs);

      const [invs, custs] = await Promise.all([
        base44.entities.Invoice.filter({ business_id: businessId }),
        base44.entities.Customer.filter({ business_id: businessId }),
      ]);

      const im = {};
      invs.forEach(inv => { if (inv.job_id) im[inv.job_id] = inv; });
      setInvoiceMap(im);

      const cm = {};
      custs.forEach(c => { cm[c.id] = c; });
      setCustomerMap(cm);
      setLoading(false);
    })();
  }, [businessId]);

  const filtered = jobs.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'active') return job.status === 'Scheduled' || job.status === 'In Progress';
    if (filter === 'needs_invoice') return job.status === 'Completed' && !invoiceMap[job.id];
    if (filter === 'unpaid') {
      const inv = invoiceMap[job.id];
      return inv && inv.status !== 'Paid' && inv.status !== 'Cancelled';
    }
    return job.status === filter;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(opt => {
          const count = opt.value !== 'all' ? getJobCount(jobs, invoiceMap, opt.value) : null;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {opt.label}
              {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-sm">
          No jobs match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const invoice = invoiceMap[job.id];
            const customer = customerMap[job.customer_id];
            const stages = getStageStatuses(job, invoice);

            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block bg-white border rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[job.status] || 'bg-slate-100 text-slate-500'}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {customer && <p className="text-xs text-slate-500">{customer.name}</p>}
                      {job.scheduled_date && (
                        <p className="text-xs text-slate-400">
                          {format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Mini lifecycle strip */}
                    <div className="flex items-start gap-3 mt-3 pt-3 border-t">
                      {STAGE_KEYS.map((key, idx) => (
                        <div key={key} className="flex items-center gap-3">
                          <MiniStage status={stages[key]} label={STAGE_LABELS[key]} />
                          {idx < STAGE_KEYS.length - 1 && (
                            <div className="w-4 h-px bg-slate-200 flex-shrink-0 -mt-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Leads section — collapsible, always at bottom */}
      <LeadsSection />
    </div>
  );
}