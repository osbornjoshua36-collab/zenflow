import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Download } from 'lucide-react';

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
  const [sellerSearch, setSellerSearch] = useState('');
  const [bizList, setBizList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [txnStatusFilter, setTxnStatusFilter] = useState('all');
  const [txnSearchSeller, setTxnSearchSeller] = useState('');

  const loadData = async () => {
    const [rpts, lstgs, biz, quotes, jobs, reviews, txns] = await Promise.all([
      base44.entities.Report.list('-created_date', 500),
      base44.entities.Listing.list('-created_date', 500),
      base44.entities.Business.list('-created_date', 500),
      base44.entities.Quote.list('-created_date', 1),
      base44.entities.Job.list('-created_date', 1),
      base44.entities.Review.filter({ verified: true }, '-created_date', 1),
      base44.entities.Transaction.list('-created_date', 500),
    ]);
    const bizMap = {};
    biz.forEach(b => { bizMap[b.id] = b; });
    setReports(rpts);
    setListings(lstgs);
    setBusinesses(bizMap);
    setBizList(biz);
    setTransactions(txns);
    setMetrics({
      businesses: biz.length,
      activeListings: lstgs.filter(l => l.status === 'Active').length,
      quotes: 0,
      jobs: 0,
      reviews: 0,
      openReports: rpts.filter(r => r.status === 'open').length,
    });
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

  const updateVerification = async (id, updates) => {
    await base44.entities.Business.update(id, updates);
    setBizList(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
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
            <TabsTrigger value="sellers">Business Accounts</TabsTrigger>
            <TabsTrigger value="metrics">Platform Metrics</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
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
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Business</th>
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

          {/* TAB: Sellers */}
          <TabsContent value="sellers">
            {/* Status counts */}
            <div className="flex gap-4 mb-4 text-sm">
              {[
                { label: 'Verified', count: bizList.filter(b => b.verification_status === 'verified').length, color: 'text-green-700' },
                { label: 'Pending', count: bizList.filter(b => b.verification_status === 'pending').length, color: 'text-amber-600' },
                { label: 'Suspended', count: bizList.filter(b => b.verification_status === 'suspended').length, color: 'text-red-600' },
                { label: 'Unverified', count: bizList.filter(b => !b.verification_status || b.verification_status === 'unverified').length, color: 'text-slate-500' },
              ].map(s => (
                <span key={s.label} className="text-slate-500">{s.label}: <strong className={s.color}>{s.count}</strong></span>
              ))}
            </div>
            <div className="mb-4">
              <Input
                placeholder="Search by business name..."
                value={sellerSearch}
                onChange={e => setSellerSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Business</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Owner Email</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Verification</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Verified At</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bizList
                    .filter(b => !sellerSearch || b.name?.toLowerCase().includes(sellerSearch.toLowerCase()))
                    .map(b => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{b.owner_email || '—'}</td>
                      <td className="px-4 py-3">
                        {b.phone_verified
                          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✓ Verified</span>
                          : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                          b.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          b.verification_status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {b.verification_status || 'unverified'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {b.verified_at ? new Date(b.verified_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {b.verification_status !== 'verified' && (
                            <button
                              onClick={() => updateVerification(b.id, { is_verified: true, verification_status: 'verified', verified_at: new Date().toISOString() })}
                              className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                              Verify
                            </button>
                          )}
                          {b.verification_status !== 'pending' && (
                            <button
                              onClick={() => updateVerification(b.id, { is_verified: false, verification_status: 'pending' })}
                              className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
                              Mark Pending
                            </button>
                          )}
                          {b.verification_status !== 'suspended' && (
                            <button
                              onClick={() => updateVerification(b.id, { is_verified: false, verification_status: 'suspended' })}
                              className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                              Suspend
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

          {/* TAB — Transactions */}
          <TabsContent value="transactions">
            {(() => {
              const filteredTxns = transactions.filter(t => {
                const matchStatus = txnStatusFilter === 'all' || t.status === txnStatusFilter;
                const sellerBiz = businesses[t.seller_business_id];
                const matchSeller = !txnSearchSeller || sellerBiz?.name?.toLowerCase().includes(txnSearchSeller.toLowerCase());
                return matchStatus && matchSeller;
              });
              const totalGross = filteredTxns.reduce((s, t) => s + (t.gross_amount || 0), 0);
              const totalCommission = filteredTxns.reduce((s, t) => s + (t.commission_amount || 0), 0);

              const exportCSV = () => {
                const header = 'Date,Buyer,Seller,Job ID,Gross,Commission,Net,Status';
                const rows = filteredTxns.map(t => [
                  new Date(t.created_date).toLocaleDateString(),
                  t.buyer_email || '',
                  businesses[t.seller_business_id]?.name || '',
                  t.job_id || '',
                  t.gross_amount?.toFixed(2) || '0',
                  t.commission_amount?.toFixed(2) || '0',
                  t.net_amount?.toFixed(2) || '0',
                  t.status || '',
                ].join(','));
                const csv = [header, ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'transactions.csv'; a.click();
                URL.revokeObjectURL(url);
              };

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="flex gap-2">
                      {['all', 'completed', 'refunded', 'partially_refunded', 'disputed'].map(s => (
                        <Button key={s} size="sm" variant={txnStatusFilter === s ? 'default' : 'outline'}
                          onClick={() => setTxnStatusFilter(s)} className="capitalize">{s === 'all' ? 'All' : s.replace('_', ' ')}</Button>
                      ))}
                    </div>
                    <Input placeholder="Search by business..." value={txnSearchSeller}
                      onChange={e => setTxnSearchSeller(e.target.value)} className="max-w-xs" />
                    <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={exportCSV}>
                      <Download className="w-4 h-4" /> Export CSV
                    </Button>
                  </div>
                  <div className="flex gap-6 text-sm text-slate-500 mb-2">
                    <span>Transactions: <strong className="text-slate-900">{filteredTxns.length}</strong></span>
                    <span>Gross: <strong className="text-slate-900">${totalGross.toFixed(2)}</strong></span>
                    <span>Platform revenue: <strong className="text-green-700">${totalCommission.toFixed(2)}</strong></span>
                  </div>
                  <div className="bg-white rounded-xl border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-600 font-medium">Date</th>
                          <th className="text-left px-4 py-3 text-slate-600 font-medium">Buyer</th>
                          <th className="text-left px-4 py-3 text-slate-600 font-medium">Business</th>
                          <th className="text-left px-4 py-3 text-slate-600 font-medium">Job ID</th>
                          <th className="text-right px-4 py-3 text-slate-600 font-medium">Gross</th>
                          <th className="text-right px-4 py-3 text-slate-600 font-medium">Fee</th>
                          <th className="text-right px-4 py-3 text-slate-600 font-medium">Net</th>
                          <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTxns.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-10 text-slate-400">No transactions found.</td></tr>
                        ) : filteredTxns.map(t => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.created_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{t.buyer_email || '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">{businesses[t.seller_business_id]?.name || '—'}</td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-400">{t.job_id?.slice(0,8)}…</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">${t.gross_amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-3 text-right text-red-600 text-xs">${t.commission_amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-3 text-right text-green-700 font-medium">${t.net_amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                t.status === 'completed' ? 'bg-green-100 text-green-700' :
                                t.status === 'refunded' ? 'bg-red-100 text-red-700' :
                                t.status === 'partially_refunded' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>{t.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 3 — Metrics */}
          <TabsContent value="metrics">
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800">Founding Member Progress</p>
                    <p className="text-xs text-amber-600 mt-0.5">Founding member pricing locks when 200 active business accounts are reached</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-amber-700">{bizList.filter(b => b.is_founding_member).length} <span className="text-lg font-normal text-amber-500">/ 200</span></p>
                    <p className="text-xs text-amber-600">{200 - bizList.filter(b => b.is_founding_member).length} spots remaining</p>
                  </div>
                </div>
                {[
                  { label: 'Total Businesses', value: metrics.businesses, color: 'text-blue-600' },
                  { label: 'Active Business Accounts', value: bizList.filter(b => b.onboarding_status === 'active').length, color: 'text-green-600' },
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