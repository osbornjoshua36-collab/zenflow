import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  reviewed: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-slate-100 text-slate-500',
  Active: 'bg-green-100 text-green-700',
  Draft: 'bg-yellow-100 text-yellow-700',
  Paused: 'bg-orange-100 text-orange-700',
  Archived: 'bg-slate-100 text-slate-500',
};

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [listings, setListings] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [reportFilter, setReportFilter] = useState('all');
  const [listingSearch, setListingSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [rpts, lstgs, biz, quotes, jobs, reviews] = await Promise.all([
      base44.entities.Report.list('-created_date', 500),
      base44.entities.Listing.list('-created_date', 500),
      base44.entities.Business.list('-created_date', 500),
      base44.entities.Quote.list('-created_date', 1),
      base44.entities.Job.list('-created_date', 1),
      base44.entities.Review.filter({ verified: true }, '-created_date', 1),
    ]);
    const bizMap = {};
    biz.forEach(b => { bizMap[b.id] = b; });
    setReports(rpts);
    setListings(lstgs);
    setBusinesses(bizMap);
    setMetrics({
      businesses: biz.length,
      activeListings: lstgs.filter(l => l.status === 'Active').length,
      quotes: quotes.length > 0 ? null : 0,
      jobs: jobs.length > 0 ? null : 0,
      reviews: reviews.length > 0 ? null : 0,
      openReports: rpts.filter(r => r.status === 'open').length,
    });
    // Get real counts via separate queries for metrics
    const [allQuotes, allJobs, allVerifiedReviews] = await Promise.all([
      base44.entities.Quote.list('-created_date', 9999),
      base44.entities.Job.list('-created_date', 9999),
      base44.entities.Review.filter({ verified: true }, '-created_date', 9999),
    ]);
    setMetrics({
      businesses: biz.length,
      activeListings: lstgs.filter(l => l.status === 'Active').length,
      quotes: allQuotes.length,
      jobs: allJobs.length,
      reviews: allVerifiedReviews.length,
      openReports: rpts.filter(r => r.status === 'open').length,
    });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const updateReport = async (id, status) => {
    await base44.entities.Report.update(id, { status });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const updateListing = async (id, status) => {
    await base44.entities.Listing.update(id, { status });
    setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const filteredReports = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter);
  const filteredListings = listings.filter(l =>
    !listingSearch || l.title?.toLowerCase().includes(listingSearch.toLowerCase())
  );
  const openCount = reports.filter(r => r.status === 'open').length;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="reports" className="gap-2">
              Reports Queue
              {openCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{openCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="metrics">Platform Metrics</TabsTrigger>
          </TabsList>

          {/* TAB 1 — Reports */}
          <TabsContent value="reports">
            <div className="flex gap-2 mb-4">
              {['all', 'open', 'reviewed', 'dismissed'].map(f => (
                <Button key={f} size="sm" variant={reportFilter === f ? 'default' : 'outline'}
                  onClick={() => setReportFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'open' && openCount > 0 && ` (${openCount})`}
                </Button>
              ))}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Target</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Reason</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Reporter</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">No reports found.</td></tr>
                  ) : filteredReports.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium capitalize">{r.target_type}</td>
                      <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.reporter_email || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.created_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <Link
                            to={r.target_type === 'listing' ? `/community` : `/seller/${r.target_id}`}
                            className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            View target
                          </Link>
                          {r.status !== 'reviewed' && (
                            <button onClick={() => updateReport(r.id, 'reviewed')}
                              className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                              Mark reviewed
                            </button>
                          )}
                          {r.status !== 'dismissed' && (
                            <button onClick={() => updateReport(r.id, 'dismissed')}
                              className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
                              Dismiss
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 2 — Listings */}
          <TabsContent value="listings">
            <div className="flex items-center justify-between mb-4 gap-4">
              <Input
                placeholder="Search by title..."
                value={listingSearch}
                onChange={e => setListingSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex gap-3 text-sm text-slate-500">
                <span>Active: <strong className="text-green-700">{listings.filter(l => l.status === 'Active').length}</strong></span>
                <span>Paused: <strong className="text-orange-600">{listings.filter(l => l.status === 'Paused').length}</strong></span>
                <span>Total: <strong className="text-slate-700">{listings.length}</strong></span>
              </div>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Title</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Seller</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Views</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Created</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">No listings found.</td></tr>
                  ) : filteredListings.map(l => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{l.title}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{businesses[l.business_id]?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{l.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-500'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{l.view_count ?? 0}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(l.created_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {l.status === 'Active' ? (
                          <button onClick={() => updateListing(l.id, 'Paused')}
                            className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => updateListing(l.id, 'Active')}
                            className="text-xs px-2 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 3 — Metrics */}
          <TabsContent value="metrics">
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Total Businesses', value: metrics.businesses, color: 'text-blue-600' },
                  { label: 'Active Listings', value: metrics.activeListings, color: 'text-green-600' },
                  { label: 'Quotes Submitted', value: metrics.quotes, color: 'text-purple-600' },
                  { label: 'Jobs Created', value: metrics.jobs, color: 'text-amber-600' },
                  { label: 'Verified Reviews', value: metrics.reviews, color: 'text-teal-600' },
                  { label: 'Open Reports', value: metrics.openReports, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border p-6">
                    <p className="text-sm text-slate-500 mb-1">{label}</p>
                    <p className={`text-4xl font-bold ${color}`}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}