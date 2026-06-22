import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Inbox, DollarSign, Calendar, User, LayoutGrid, List, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

// ─── Kanban column definitions ────────────────────────────────────────────────

const COLUMNS = [
  {
    id: 'lead',
    label: 'Lead',
    color: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    lightBorder: 'border-purple-200',
    textColor: 'text-purple-700',
    dot: 'bg-purple-400',
    match: (job, inv) => !job.scheduled_date && job.status !== 'Cancelled' && job.status !== 'No-Show',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    color: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-200',
    textColor: 'text-blue-700',
    dot: 'bg-blue-400',
    match: (job) => job.status === 'Scheduled',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    lightBorder: 'border-orange-200',
    textColor: 'text-orange-700',
    dot: 'bg-orange-400',
    match: (job) => job.status === 'In Progress',
  },
  {
    id: 'completed',
    label: 'Done',
    color: 'bg-teal-500',
    lightBg: 'bg-teal-50',
    lightBorder: 'border-teal-200',
    textColor: 'text-teal-700',
    dot: 'bg-teal-400',
    match: (job, inv) => job.status === 'Completed' && !inv,
  },
  {
    id: 'invoiced',
    label: 'Invoiced',
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    lightBorder: 'border-amber-200',
    textColor: 'text-amber-700',
    dot: 'bg-amber-400',
    match: (job, inv) => job.status === 'Completed' && inv && inv.status !== 'Paid',
  },
  {
    id: 'paid',
    label: 'Paid',
    color: 'bg-green-500',
    lightBg: 'bg-green-50',
    lightBorder: 'border-green-200',
    textColor: 'text-green-700',
    dot: 'bg-green-400',
    match: (job, inv) => inv?.status === 'Paid',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    color: 'bg-slate-400',
    lightBg: 'bg-slate-50',
    lightBorder: 'border-slate-200',
    textColor: 'text-slate-500',
    dot: 'bg-slate-300',
    match: (job) => job.status === 'Cancelled' || job.status === 'No-Show',
  },
];

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({ job, customer, invoice, col }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">{job.title}</p>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-0.5" />
      </div>

      {customer && (
        <div className="flex items-center gap-1 mt-1.5">
          <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500 truncate">{customer.name}</p>
        </div>
      )}

      {job.scheduled_date && (
        <div className="flex items-center gap-1 mt-1">
          <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</p>
        </div>
      )}

      {(job.estimated_cost || invoice?.total_amount) && (
        <div className="flex items-center gap-1 mt-1">
          <DollarSign className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            {invoice?.total_amount
              ? `$${invoice.total_amount.toLocaleString()}`
              : `Est. $${job.estimated_cost?.toLocaleString()}`}
          </p>
        </div>
      )}

      {invoice && (
        <div className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block font-medium ${col.lightBg} ${col.textColor}`}>
          {invoice.status}
        </div>
      )}
    </Link>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, jobs, customerMap, invoiceMap }) {
  const total = jobs.reduce((sum, j) => {
    const inv = invoiceMap[j.id];
    return sum + (inv?.total_amount || j.estimated_cost || 0);
  }, 0);

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.lightBg} ${col.lightBorder} border border-b-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <span className={`text-xs font-semibold ${col.textColor}`}>{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${col.lightBg} ${col.textColor}`}>
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className={`flex-1 rounded-b-lg border ${col.lightBorder} p-2 space-y-2 min-h-[120px] bg-white`}>
        {jobs.length === 0 && (
          <div className="text-xs text-slate-300 text-center pt-6">Empty</div>
        )}
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            customer={customerMap[job.customer_id]}
            invoice={invoiceMap[job.id]}
            col={col}
          />
        ))}
      </div>

      {/* Column total */}
      {total > 0 && (
        <div className={`text-xs text-center py-1.5 rounded-b-lg ${col.lightBg} ${col.textColor} font-medium border ${col.lightBorder} border-t-0`}>
          ${total.toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ─── Leads section ────────────────────────────────────────────────────────────

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
          <div className="flex border-b px-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label} ({t.items.length})
              </button>
            ))}
          </div>
          {loading && <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>}
          {!loading && activeItems.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No messages here.</div>}
          <div className="divide-y max-h-72 overflow-y-auto">
            {activeItems.map(msg => (
              <div key={msg.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {customers[msg.customer_id]?.name || 'Unknown'}
                    </p>
                    {msg.ai_drafted && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">AI Draft</span>}
                    {msg.channel && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{msg.channel}</span>}
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

// ─── List view (compact fallback) ────────────────────────────────────────────

function ListView({ jobs, customerMap, invoiceMap }) {
  if (jobs.length === 0) {
    return <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-sm">No jobs found.</div>;
  }
  return (
    <div className="space-y-2">
      {jobs.map(job => {
        const customer = customerMap[job.customer_id];
        const invoice = invoiceMap[job.id];
        const col = COLUMNS.find(c => c.match(job, invoice)) || COLUMNS[0];
        return (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 hover:shadow-sm hover:border-slate-300 transition-all"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {customer && <p className="text-xs text-slate-500">{customer.name}</p>}
                {job.scheduled_date && <p className="text-xs text-slate-400">{format(new Date(job.scheduled_date), 'MMM d, yyyy')}</p>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${col.lightBg} ${col.textColor} flex-shrink-0`}>
              {col.label}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobPipelineView({ businessId }) {
  const [jobs, setJobs] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [customerMap, setCustomerMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [allJobs, invs, custs] = await Promise.all([
        base44.entities.Job.filter({ business_id: businessId }, '-scheduled_date', 100),
        base44.entities.Invoice.filter({ business_id: businessId }),
        base44.entities.Customer.filter({ business_id: businessId }),
      ]);
      setJobs(allJobs);

      const im = {};
      invs.forEach(inv => { if (inv.job_id) im[inv.job_id] = inv; });
      setInvoiceMap(im);

      const cm = {};
      custs.forEach(c => { cm[c.id] = c; });
      setCustomerMap(cm);
      setLoading(false);
    })();
  }, [businessId]);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const activeColumns = showCancelled ? COLUMNS : COLUMNS.filter(c => c.id !== 'cancelled');

  // Summary stats
  const totalRevenue = Object.values(invoiceMap).filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total_amount || 0), 0);
  const outstanding = Object.values(invoiceMap).filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + (i.total_amount || 0), 0);
  const activeCount = jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress').length;
  const needsInvoice = jobs.filter(j => j.status === 'Completed' && !invoiceMap[j.id]).length;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Jobs', value: activeCount, color: 'text-blue-600' },
          { label: 'Needs Invoice', value: needsInvoice, color: 'text-amber-600' },
          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, color: 'text-orange-600' },
          { label: 'Collected', value: `$${totalRevenue.toLocaleString()}`, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCancelled(v => !v)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              showCancelled ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {showCancelled ? 'Hide Cancelled' : 'Show Cancelled'}
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            title="Kanban view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {activeColumns.map(col => {
              const colJobs = jobs.filter(j => col.match(j, invoiceMap[j.id]));
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  jobs={colJobs}
                  customerMap={customerMap}
                  invoiceMap={invoiceMap}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <ListView jobs={jobs} customerMap={customerMap} invoiceMap={invoiceMap} />
      )}

      {/* Leads section */}
      <LeadsSection />
    </div>
  );
}