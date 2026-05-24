import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, CheckCircle2 } from 'lucide-react';

const PLATFORM_COLORS = {
  Google:   'bg-blue-100 text-blue-800',
  Yelp:     'bg-red-100 text-red-800',
  Facebook: 'bg-indigo-100 text-indigo-800',
  Internal: 'bg-slate-100 text-slate-600',
};

function StarRow({ rating, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

function ReviewCard({ review, custMap, onUpdated, plan }) {
  const [draft, setDraft] = useState(review.ai_response_draft || '');
  const [posting, setPosting] = useState(false);
  const customer = custMap[review.customer_id];

  const handlePost = async () => {
    setPosting(true);
    await base44.entities.Review.update(review.id, { response_posted: true });
    onUpdated();
    setPosting(false);
  };

  const handleEditPost = async () => {
    setPosting(true);
    await base44.entities.Review.update(review.id, { ai_response_draft: draft, response_posted: true });
    onUpdated();
    setPosting(false);
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{customer?.name || 'Unknown Customer'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[review.platform] || 'bg-slate-100 text-slate-600'}`}>
              {review.platform || 'Internal'}
            </span>
            {review.response_posted && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Response posted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRow rating={review.rating} />
            <span className="text-xs text-slate-400">
              {review.created_date ? new Date(review.created_date).toLocaleDateString() : ''}
            </span>
          </div>
        </div>
      </div>

      {review.text && <p className="text-sm text-slate-700 leading-relaxed">{review.text}</p>}

      {!review.response_posted && review.ai_response_draft && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Response Draft</p>
          {(plan === 'pro' || plan === 'business') ? (
            <>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-blue-50 border-blue-100 text-slate-800"
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={posting} onClick={handlePost}>
                  {posting ? 'Posting...' : 'Post Response'}
                </Button>
                <Button size="sm" variant="outline" disabled={posting} onClick={handleEditPost}>
                  Edit &amp; Post
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-500">AI response drafting requires Pro plan.</span>
              <Link to="/seller/subscription" className="text-sm text-terracotta font-medium underline">Upgrade →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Reputation() {
  const [reviews, setReviews] = useState([]);
  const [custMap, setCustMap] = useState({});
  const [subPlan, setSubPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const loadData = async () => {
    const [revData, custData, bizList] = await Promise.all([
      base44.entities.Review.list('-created_date', 200),
      base44.entities.Customer.list('-created_date', 200),
      base44.entities.Business.list('-created_date', 1),
    ]);
    const biz = bizList[0] || null;
    setSubPlan(biz?.subscription_plan || 'starter');
    const map = Object.fromEntries(custData.map(c => [c.id, c]));
    setCustMap(map);
    setReviews(biz ? revData.filter(r => r.business_id === biz.id) : revData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';
  const awaitingCount = reviews.filter(r => !r.response_posted && r.ai_response_draft).length;
  const platforms = [...new Set(reviews.map(r => r.platform).filter(Boolean))];

  const filtered = reviews
    .filter(r => {
      if (filterStatus === 'awaiting') return !r.response_posted && r.ai_response_draft;
      if (filterStatus === 'responded') return r.response_posted;
      return true;
    })
    .filter(r => filterPlatform === 'all' || r.platform === filterPlatform)
    .filter(r => filterRating === 'all' || String(r.rating) === filterRating)
    .sort((a, b) => {
      if (sortOrder === 'lowest') return (a.rating || 0) - (b.rating || 0);
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* SECTION 1 — Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 mb-1">Average Rating</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>{avgRating}</span>
            {reviews.length > 0 && <StarRow rating={Math.round(parseFloat(avgRating))} />}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 mb-1">Total Reviews</p>
          <span className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-fraunces)' }}>{reviews.length}</span>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500 mb-1">Awaiting Response</p>
          <span className={`text-3xl font-bold ${awaitingCount > 0 ? 'text-amber-600' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-fraunces)' }}>{awaitingCount}</span>
        </div>
      </div>

      {/* SECTION 3 — Filter bar */}
      <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border p-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="awaiting">Awaiting Response</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {[5,4,3,2,1].map(n => <SelectItem key={n} value={String(n)}>{n} Stars</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="lowest">Lowest Rating First</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-slate-400">{filtered.length} review{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* SECTION 2 — Review list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
          No reviews match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ReviewCard key={r.id} review={r} custMap={custMap} onUpdated={loadData} plan={subPlan} />
          ))}
        </div>
      )}
    </div>
  );
}