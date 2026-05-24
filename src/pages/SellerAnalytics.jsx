import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Eye, MessageSquare, DollarSign, Megaphone } from 'lucide-react';

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function getMonthName(date) {
  return date.toLocaleString('default', { month: 'short', year: '2-digit' });
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: getMonthName(d), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

export default function SellerAnalytics() {
  const [business, setBusiness] = useState(null);
  const [listings, setListings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      if (!bizList.length) { setLoading(false); return; }
      const biz = bizList[0];
      setBusiness(biz);

      const [listingsData, quotesData, jobsData, reviewsData, adsData] = await Promise.all([
        base44.entities.Listing.filter({ business_id: biz.id }, '-view_count', 100),
        base44.entities.Quote.filter({ business_id: biz.id }, '-created_date', 500),
        base44.entities.Job.filter({ business_id: biz.id, status: 'Completed' }, '-created_date', 500),
        base44.entities.Review.filter({ business_id: biz.id }, '-created_date', 500),
        base44.entities.Ad.filter({ business_id: biz.id, status: 'Active' }, '-created_date', 20),
      ]);
      setListings(listingsData);
      setQuotes(quotesData);
      setJobs(jobsData);
      setReviews(reviewsData);
      setAds(adsData);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (!business) return (
    <div className="text-center text-slate-500 py-16">No business found.</div>
  );

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Section 1 — metrics
  const totalViews = listings.reduce((a, l) => a + (l.view_count || 0), 0);
  const quotesThisMonth = quotes.filter(q => q.created_date && new Date(q.created_date) >= thisMonthStart);
  const totalQuotesThisMonth = quotesThisMonth.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'Accepted');
  const conversionRate = quotes.length > 0 ? Math.round((acceptedQuotes.length / quotes.length) * 100) : 0;
  const revenueThisMonth = jobs
    .filter(j => j.created_date && new Date(j.created_date) >= thisMonthStart)
    .reduce((a, j) => a + (j.actual_cost || 0), 0);

  // Section 2 — listing performance table
  const listingPerformance = listings.map(l => {
    const lQuotes = quotes.filter(q => q.listing_id === l.id);
    const lAccepted = lQuotes.filter(q => q.status === 'Accepted');
    const lReviews = reviews.filter(r => r.verified === true);
    // business-level avg rating per listing isn't tracked per listing in entity, use business-level
    const avgRating = lReviews.length > 0
      ? (lReviews.reduce((a, r) => a + r.rating, 0) / lReviews.length).toFixed(1)
      : null;
    const conv = lQuotes.length > 0 ? Math.round((lAccepted.length / lQuotes.length) * 100) : 0;
    return { ...l, quoteCount: lQuotes.length, convRate: conv, avgRating };
  }).sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

  const topListingId = listingPerformance[0]?.id;

  // Section 3 — monthly chart
  const months = getLast6Months();
  const chartData = months.map(m => {
    const mQuotes = quotes.filter(q => {
      const d = q.created_date ? new Date(q.created_date) : null;
      return d && d.getFullYear() === m.year && d.getMonth() === m.month;
    });
    const mConverted = mQuotes.filter(q => q.status === 'Accepted');
    return { name: m.label, Received: mQuotes.length, Converted: mConverted.length };
  });

  // Section 4 — ad performance
  const activeAds = ads;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Analytics</h1>
        <p className="text-sm text-slate-500">Performance overview for {business.name}</p>
      </div>

      {/* Section 1 — Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Listing Views (all time)" value={totalViews.toLocaleString()} icon={Eye} color="bg-blue-500" />
        <MetricCard label="Quote Requests (this month)" value={totalQuotesThisMonth} icon={MessageSquare} color="bg-amber-500" />
        <MetricCard label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} color="bg-sage" />
        <MetricCard label="Revenue This Month" value={`$${revenueThisMonth.toLocaleString()}`} icon={DollarSign} color="bg-green-600" />
      </div>

      {/* Section 2 — Listing performance table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Listing Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Title</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Views</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Quotes</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Conv. Rate</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Avg Rating</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {listingPerformance.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No listings yet.</td></tr>
              ) : listingPerformance.map(l => (
                <tr
                  key={l.id}
                  className="border-b last:border-0 hover:bg-slate-50"
                  style={l.id === topListingId ? { borderLeft: '3px solid #D4A03A' } : {}}
                >
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                    {l.id === topListingId && <span className="text-amber-500 mr-1">★</span>}
                    {l.title}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{l.category}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{l.view_count || 0}</td>
                  <td className="px-4 py-3 text-slate-700">{l.quoteCount}</td>
                  <td className="px-4 py-3 text-slate-700">{l.convRate}%</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.avgRating ? `⭐ ${l.avgRating}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      l.status === 'Active' ? 'bg-green-100 text-green-700' :
                      l.status === 'Paused' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 — Monthly quotes chart */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Quote Activity — Last 6 Months</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />
            <Line type="monotone" dataKey="Received" stroke="#D4A03A" strokeWidth={2.5} dot={{ r: 4, fill: '#D4A03A' }} />
            <Line type="monotone" dataKey="Converted" stroke="#5BAA7E" strokeWidth={2.5} dot={{ r: 4, fill: '#5BAA7E' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 4 — Ad performance */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Ad Performance</h2>
        {activeAds.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-medium">No active ad campaigns</p>
            <p className="text-sm mt-1">Boost your listings to reach more buyers.</p>
            <Link to="/seller/ads" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
              Go to Ad Manager →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAds.map(ad => {
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
              return (
                <div key={ad.id} className="border rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-slate-700 truncate">{ad.headline}</p>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{ad.tier}</span>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
                    <div><p className="text-slate-400 text-xs">Impressions</p><p className="font-semibold text-slate-700">{(ad.impressions || 0).toLocaleString()}</p></div>
                    <div><p className="text-slate-400 text-xs">Clicks</p><p className="font-semibold text-slate-700">{(ad.clicks || 0).toLocaleString()}</p></div>
                    <div><p className="text-slate-400 text-xs">CTR</p><p className="font-semibold text-slate-700">{ctr}%</p></div>
                    <div><p className="text-slate-400 text-xs">Budget</p><p className="font-semibold text-slate-700">${ad.budget?.toLocaleString() || '—'}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}