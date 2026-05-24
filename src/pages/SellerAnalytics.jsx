import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Eye, MessageSquare, DollarSign, Star, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.08)', boxShadow: '0 2px 10px rgba(30,50,69,0.05)' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: trend >= 0 ? '#276048' : '#C06060' }}>
          {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-2xl font-bold mb-0.5" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>{value}</div>
    <div className="text-xs font-medium" style={{ color: '#4A6580' }}>{label}</div>
    {sub && <div className="text-xs mt-1" style={{ color: '#8DAFC8' }}>{sub}</div>}
  </div>
);

export default function SellerAnalytics() {
  const [listings, setListings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [ads, setAds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Listing.list('-created_date', 200),
      base44.entities.Quote.list('-created_date', 500),
      base44.entities.Ad.list('-created_date', 100),
      base44.entities.Review.list('-created_date', 200),
      base44.entities.Business.list('-created_date', 50),
    ]).then(([l, q, a, r, b]) => {
      setListings(l);
      setQuotes(q);
      setAds(a);
      setReviews(r);
      setBusinesses(b);
      setLoading(false);
    });
  }, []);

  const filterByBiz = (arr, key = 'business_id') =>
    selectedBiz === 'all' ? arr : arr.filter(x => x[key] === selectedBiz);

  const filteredListings = filterByBiz(listings);
  const filteredQuotes = filterByBiz(quotes);
  const filteredAds = filterByBiz(ads);
  const filteredReviews = filterByBiz(reviews);

  const totalViews = filteredListings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalQuotes = filteredQuotes.length;
  const acceptedQuotes = filteredQuotes.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
  const avgRating = filteredReviews.length > 0
    ? (filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / filteredReviews.length).toFixed(1)
    : '—';
  const activeAds = filteredAds.filter(a => a.status === 'Active').length;
  const totalAdImpressions = filteredAds.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalAdClicks = filteredAds.reduce((s, a) => s + (a.clicks || 0), 0);

  // Quote trend: last 7 days
  const quoteTrend = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, 'MMM d');
    const count = filteredQuotes.filter(q => {
      const d = new Date(q.created_date);
      return format(d, 'MMM d') === dayStr;
    }).length;
    return { day: format(day, 'EEE'), count };
  });

  // Listing performance
  const topListings = [...filteredListings]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  // Quote status breakdown
  const quoteStatusData = ['Pending', 'Quoted', 'Accepted', 'Declined', 'Converted'].map(s => ({
    status: s,
    count: filteredQuotes.filter(q => q.status === s).length,
  })).filter(d => d.count > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" style={{ borderTopColor: '#E8945A' }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Seller Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A6580' }}>Track your listings, quotes, and ad performance</p>
        </div>
        <select
          className="text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: 'rgba(30,50,69,0.15)', color: '#1E3245', background: '#fff' }}
          value={selectedBiz}
          onChange={e => setSelectedBiz(e.target.value)}
        >
          <option value="all">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Eye} label="Total Listing Views" value={totalViews.toLocaleString()} color="#E8945A" />
        <StatCard icon={MessageSquare} label="Quote Requests" value={totalQuotes} sub={`${acceptedQuotes} accepted`} color="#7A6AAA" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} sub="quotes → accepted" color="#5BAA7E" />
        <StatCard icon={Star} label="Avg. Rating" value={avgRating} sub={`${filteredReviews.length} reviews`} color="#D4A03A" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Quote trend */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.08)', boxShadow: '0 2px 10px rgba(30,50,69,0.05)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Quote Requests — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={quoteTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,50,69,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8DAFC8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8DAFC8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#7A6AAA" strokeWidth={2.5} dot={{ fill: '#7A6AAA', r: 4 }} name="Quotes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quote status breakdown */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.08)', boxShadow: '0 2px 10px rgba(30,50,69,0.05)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Quote Status Breakdown</h3>
          {quoteStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#8DAFC8' }}>No quote data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={quoteStatusData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,50,69,0.06)" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#8DAFC8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8DAFC8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#E8945A" radius={[4, 4, 0, 0]} name="Quotes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top listings */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.08)', boxShadow: '0 2px 10px rgba(30,50,69,0.05)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Top Listings by Views</h3>
          {topListings.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#8DAFC8' }}>No listings yet</p>
          ) : (
            <div className="space-y-3">
              {topListings.map((l, i) => {
                const max = topListings[0]?.view_count || 1;
                const pct = Math.round(((l.view_count || 0) / max) * 100);
                return (
                  <div key={l.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium truncate max-w-[70%]" style={{ color: '#1E3245' }}>{l.title}</span>
                      <span style={{ color: '#4A6580' }}>{l.view_count || 0} views</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: '#EEF3F8' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: i === 0 ? '#E8945A' : '#8DAFC8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ad performance */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.08)', boxShadow: '0 2px 10px rgba(30,50,69,0.05)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Ad Performance</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Active Ads', value: activeAds, color: '#5BAA7E' },
              { label: 'Impressions', value: totalAdImpressions.toLocaleString(), color: '#7A6AAA' },
              { label: 'Clicks', value: totalAdClicks.toLocaleString(), color: '#E8945A' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.color + '12' }}>
                <div className="text-lg font-bold" style={{ color: s.color, fontFamily: 'var(--font-fraunces)' }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#4A6580' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {filteredAds.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#8DAFC8' }}>No active ads yet</p>
          ) : (
            <div className="space-y-2">
              {filteredAds.slice(0, 4).map(ad => (
                <div key={ad.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(30,50,69,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3" style={{ color: '#D4A03A' }} />
                    <span className="font-medium truncate max-w-[140px]" style={{ color: '#1E3245' }}>{ad.headline}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: '#EEE8FF', color: '#3D2E70' }}>{ad.tier}</span>
                  </div>
                  <span style={{ color: '#4A6580' }}>{ad.clicks || 0} clicks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}