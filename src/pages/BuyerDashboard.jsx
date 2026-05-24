import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, MessageSquare, UserCircle, Star, ChevronRight, BookmarkCheck } from 'lucide-react';

const STATUS_COLORS = {
  Pending: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-green-100 text-green-700',
  accepted: 'bg-green-100 text-green-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  Declined: 'bg-red-100 text-red-700',
};

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [activeQuotes, setActiveQuotes] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [listings, setListings] = useState({});
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const user = await base44.auth.me();

      // Check buyer profile exists
      const buyerProfiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
      if (buyerProfiles.length === 0) { navigate('/register'); return; }

      setMe(user);

      // Fetch quotes for this buyer
      const allQuotes = await base44.entities.Quote.filter({ buyer_email: user.email });
      const aq = allQuotes.filter(q => ['Pending', 'pending', 'Accepted', 'accepted'].includes(q.status));
      const cq = allQuotes.filter(q => ['Accepted', 'accepted'].includes(q.status) && q.converted_job_id);
      const completedJobIds = allQuotes
        .filter(q => q.converted_job_id)
        .map(q => q.converted_job_id);

      setActiveQuotes(aq);

      // Fetch jobs linked via converted_job_id
      if (completedJobIds.length > 0) {
        const allJobs = await Promise.all(
          completedJobIds.map(id => base44.entities.Job.filter({ id }))
        );
        const flat = allJobs.flat();
        setActiveJobs(flat.filter(j => j.status !== 'Completed'));
        setCompletedJobs(flat.filter(j => j.status === 'Completed'));

        // Fetch reviews for completed jobs
        const reviewMap = {};
        await Promise.all(
          flat.filter(j => j.status === 'Completed').map(async j => {
            const revs = await base44.entities.Review.filter({ job_id: j.id });
            if (revs.length > 0) reviewMap[j.id] = revs[0];
          })
        );
        setReviews(reviewMap);
      }

      // Collect business ids from quotes
      const bizIds = [...new Set(allQuotes.map(q => q.business_id).filter(Boolean))];
      if (bizIds.length > 0) {
        const bizList = await Promise.all(bizIds.map(id => base44.entities.Business.filter({ id })));
        const bizMap = {};
        bizList.flat().forEach(b => { bizMap[b.id] = b; });
        setBusinesses(bizMap);
      }

      // Collect listing ids from quotes
      const listingIds = [...new Set(allQuotes.map(q => q.listing_id).filter(Boolean))];
      if (listingIds.length > 0) {
        const lstList = await Promise.all(listingIds.map(id => base44.entities.Listing.filter({ id })));
        const lstMap = {};
        lstList.flat().forEach(l => { lstMap[l.id] = l; });
        setListings(lstMap);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Top buyer nav */}
      <div className="flex items-center gap-1 bg-white border rounded-xl px-4 py-2 shadow-sm">
        <Link to="/community" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <Search className="w-4 h-4" /> Browse Services
        </Link>
        <Link to="/buyer/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-terracotta text-white transition-colors">
          <Briefcase className="w-4 h-4" /> My Jobs
        </Link>
        <Link to="/buyer/messages" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <MessageSquare className="w-4 h-4" /> Messages
        </Link>
        <Link to="/buyer/account" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ml-auto">
          <UserCircle className="w-4 h-4" /> {me?.full_name || 'Account'}
        </Link>
      </div>

      {/* Section 1 — Active Quotes */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Active Quotes</h2>
        {activeQuotes.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
            No active quotes —{' '}
            <Link to="/community" className="text-blue-600 hover:underline">browse services to get started</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {activeQuotes.map(q => (
              <div key={q.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {listings[q.listing_id]?.title || q.service_description || 'Service'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {businesses[q.business_id]?.name || '—'} · Submitted {new Date(q.created_date).toLocaleDateString()}
                  </p>
                </div>
                {q.seller_price != null && (
                  <span className="text-sm font-semibold text-slate-700">${q.seller_price}</span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[q.status] || 'bg-slate-100 text-slate-600'}`}>
                  {q.status}
                </span>
                <Link
                  to={`/community`}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline whitespace-nowrap"
                >
                  View quote <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 — Active Jobs */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Active Jobs</h2>
        {activeJobs.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-400 text-sm">No active jobs yet.</div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map(j => (
              <div key={j.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{j.title}</p>
                  <p className="text-sm text-slate-500">
                    {businesses[j.business_id]?.name || '—'} · {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[j.status] || 'bg-slate-100 text-slate-600'}`}>
                  {j.status}
                </span>
                <Link
                  to={`/post-job?job_id=${j.id}`}
                  className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                >
                  Mark complete
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3 — Completed Jobs */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Completed Jobs</h2>
        {completedJobs.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-400 text-sm">No completed jobs yet.</div>
        ) : (
          <div className="space-y-3">
            {completedJobs.map(j => {
              const rev = reviews[j.id];
              return (
                <div key={j.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{j.title}</p>
                    <p className="text-sm text-slate-500">
                      {businesses[j.business_id]?.name || '—'} · Completed {j.updated_date ? new Date(j.updated_date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  {rev ? (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-4 h-4 ${i <= rev.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-300'}`} />
                      ))}
                    </div>
                  ) : (
                    <Link
                      to={`/post-job?job_id=${j.id}`}
                      className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                    >
                      Leave a review
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 4 — Saved Sellers (placeholder) */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookmarkCheck className="w-5 h-5 text-slate-400" /> Saved Sellers
        </h2>
        <div className="bg-white border rounded-xl p-8 text-center text-slate-400">
          <p className="text-sm">Sellers you save will appear here.</p>
          <Link to="/community" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Browse services</Link>
        </div>
      </section>
    </div>
  );
}