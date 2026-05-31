import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, Briefcase, MessageSquare, UserCircle, BookmarkCheck, Wrench, Home, Scissors, Zap, Leaf, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BuyerJobCard from '@/components/BuyerJobCard';
import { deriveStage } from '@/components/BuyerJobStatusBadge';

const TABS = ['Active', 'All', 'Completed', 'Drafts', 'Saved providers'];

const POPULAR_CATEGORIES = [
  { label: 'HVAC', icon: <Wrench className="w-5 h-5" /> },
  { label: 'Cleaning', icon: <Home className="w-5 h-5" /> },
  { label: 'Salon', icon: <Scissors className="w-5 h-5" /> },
  { label: 'Electrical', icon: <Zap className="w-5 h-5" /> },
  { label: 'Landscaping', icon: <Leaf className="w-5 h-5" /> },
];

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [allQuotes, setAllQuotes] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [invoices, setInvoices] = useState({});
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active');
  const [payingJobId, setPayingJobId] = useState(null);

  const loadData = useCallback(async (user) => {
    const [quotes, profileCheck] = await Promise.all([
      base44.entities.Quote.filter({ buyer_email: user.email }),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);

    if (profileCheck.length === 0) { navigate('/register'); return; }

    setAllQuotes(quotes);

    const jobIds = [...new Set(quotes.map(q => q.converted_job_id).filter(Boolean))];
    let jobs = [];
    if (jobIds.length > 0) {
      const results = await Promise.all(jobIds.map(id => base44.entities.Job.filter({ id })));
      jobs = results.flat();
      setAllJobs(jobs);
    }

    const bizIds = [...new Set([
      ...quotes.map(q => q.business_id),
      ...jobs.map(j => j.business_id),
    ].filter(Boolean))];
    if (bizIds.length > 0) {
      const bizResults = await Promise.all(bizIds.map(id => base44.entities.Business.filter({ id })));
      const map = {};
      bizResults.flat().forEach(b => { map[b.id] = b; });
      setBusinesses(map);
    }

    if (jobIds.length > 0) {
      const [invResults, revResults] = await Promise.all([
        Promise.all(jobIds.map(id => base44.entities.Invoice.filter({ job_id: id }))),
        Promise.all(jobs.filter(j => j.status === 'Completed').map(j => base44.entities.Review.filter({ job_id: j.id }))),
      ]);
      const invMap = {};
      invResults.flat().forEach(inv => { invMap[inv.job_id] = inv; });
      setInvoices(invMap);
      const revMap = {};
      revResults.flat().forEach(rev => { if (rev.job_id) revMap[rev.job_id] = rev; });
      setReviews(revMap);
    }
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const user = await base44.auth.me();
      setMe(user);
      await loadData(user);
      setLoading(false);
    })();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    const unsub1 = base44.entities.Quote.subscribe(() => {
      if (me) loadData(me);
    });
    const unsub2 = base44.entities.Job.subscribe(() => {
      if (me) loadData(me);
    });
    return () => { unsub1(); unsub2(); };
  }, [me, loadData]);

  const handlePayInvoice = async (job) => {
    const invoice = invoices[job.id];
    if (!invoice || invoice.status === 'Paid') return;
    setPayingJobId(job.id);
    const res = await base44.functions.invoke('create-checkout', {
      checkout_type: 'job_payment',
      job_id: job.id,
      invoice_id: invoice.id,
      amount: invoice.amount,
      seller_business_id: job.business_id,
    });
    if (res.data?.redirectUrl) window.location.href = res.data.redirectUrl;
    setPayingJobId(null);
  };

  // Build unified job items: each quote = one item, with its linked job if any
  const unifiedItems = allQuotes.map(quote => {
    const job = allJobs.find(j => j.id === quote.converted_job_id) || null;
    const stage = deriveStage(quote, job);
    return { quote, job, stage };
  });

  // Also include jobs not linked to any quote
  const orphanJobs = allJobs.filter(j => !allQuotes.some(q => q.converted_job_id === j.id));
  orphanJobs.forEach(job => {
    unifiedItems.push({ quote: null, job, stage: deriveStage(null, job) });
  });

  // Filter by tab
  const filteredItems = unifiedItems.filter(({ stage }) => {
    if (activeTab === 'Active') return ['awaiting_quotes', 'quote_received', 'booked', 'in_progress'].includes(stage);
    if (activeTab === 'Completed') return stage === 'complete';
    if (activeTab === 'Drafts') return stage === 'draft';
    if (activeTab === 'Saved providers') return false;
    return true; // All
  });

  // "Needs your attention" — items requiring buyer action
  const needsAttention = unifiedItems.filter(({ stage, quote, job }) => {
    if (stage === 'quote_received') return true;
    if (stage === 'complete' && job && !reviews[job.id]) return true;
    if (job && invoices[job.id] && invoices[job.id].status !== 'Paid') return true;
    if (stage === 'booked' && job?.scheduling_status === 'proposed') return true;
    return false;
  });

  const tabCounts = {
    Active: unifiedItems.filter(({ stage }) => ['awaiting_quotes', 'quote_received', 'booked', 'in_progress'].includes(stage)).length,
    All: unifiedItems.length,
    Completed: unifiedItems.filter(({ stage }) => stage === 'complete').length,
    Drafts: unifiedItems.filter(({ stage }) => stage === 'draft').length,
    'Saved providers': 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasAnyJobs = unifiedItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top nav */}
      <div className="flex items-center gap-1 bg-white border rounded-xl px-4 py-2 shadow-sm overflow-x-auto">
        <Link to="/community" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap">
          <Search className="w-4 h-4" /> Browse Services
        </Link>
        <Link to="/buyer/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-terracotta text-white transition-colors whitespace-nowrap">
          <Briefcase className="w-4 h-4" /> My Jobs
          {needsAttention.length > 0 && (
            <span className="bg-white text-terracotta text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {needsAttention.length}
            </span>
          )}
        </Link>
        <Link to="/buyer/messages" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap">
          <MessageSquare className="w-4 h-4" /> Messages
        </Link>
        <Link to="/buyer/account" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ml-auto whitespace-nowrap">
          <UserCircle className="w-4 h-4" /> {me?.full_name?.split(' ')[0] || 'Account'}
        </Link>
      </div>

      {/* Empty state for brand-new buyers */}
      {!hasAnyJobs ? (
        <div className="bg-white border rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Welcome to your dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">Find a local service provider and request a quote to get started.</p>
          </div>
          <Link to="/community">
            <Button className="bg-terracotta hover:bg-terracotta/90 text-white">Find a service</Button>
          </Link>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {POPULAR_CATEGORIES.map(cat => (
              <Link key={cat.label} to={`/community?category=${encodeURIComponent(cat.label)}`}>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:border-terracotta hover:text-terracotta transition-colors">
                  {cat.icon} {cat.label}
                </button>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Needs your attention */}
          {needsAttention.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-terracotta" />
                Needs your attention
                <span className="bg-terracotta text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{needsAttention.length}</span>
              </h2>
              <div className="space-y-3">
                {needsAttention.map(({ quote, job, stage }) => (
                  <BuyerJobCard
                    key={job?.id || quote?.id}
                    quote={quote}
                    job={job}
                    businesses={businesses}
                    invoice={job ? invoices[job.id] : null}
                    review={job ? reviews[job.id] : null}
                    onPayInvoice={() => handlePayInvoice(job)}
                    paying={payingJobId === job?.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tabs + All jobs */}
          <section>
            <div className="flex items-center gap-1 border-b mb-4 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-terracotta text-terracotta'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                  {tabCounts[tab] > 0 && (
                    <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                      activeTab === tab ? 'bg-terracotta/10 text-terracotta' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tabCounts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Saved providers tab */}
            {activeTab === 'Saved providers' ? (
              <div className="bg-white border rounded-xl p-8 text-center">
                <BookmarkCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Business accounts you save will appear here.</p>
                <Link to="/community" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Browse services</Link>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-sm">
                No jobs match this filter.{' '}
                <button onClick={() => setActiveTab('All')} className="text-blue-600 hover:underline">Clear filter</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map(({ quote, job, stage }) => (
                  <BuyerJobCard
                    key={job?.id || quote?.id}
                    quote={quote}
                    job={job}
                    businesses={businesses}
                    invoice={job ? invoices[job.id] : null}
                    review={job ? reviews[job.id] : null}
                    onPayInvoice={() => handlePayInvoice(job)}
                    paying={payingJobId === job?.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}