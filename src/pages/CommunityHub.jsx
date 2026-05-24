import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Globe, ClipboardList, LayoutGrid, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '@/components/ListingCard';
import { LISTING_CATEGORIES } from '@/lib/categories';
import AdBanner from '@/components/AdBanner';
import ServiceRequestBoard from '@/components/ServiceRequestBoard';
import ReportDialog from '@/components/ReportDialog';



export default function CommunityHub() {
  const [listings, setListings] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [reviews, setReviews] = useState([]);
  const [ads, setAds] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');
  const [zipInput, setZipInput] = useState('');
  const [appliedZip, setAppliedZip] = useState('');
  const [radius, setRadius] = useState('any');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [reportListing, setReportListing] = useState(null);

  const loadData = async () => {
    const [listingsData, bizData, reviewsData, reqsData, adsData] = await Promise.all([
      base44.entities.Listing.filter({ status: 'Active' }, '-created_date', 200),
      base44.entities.Business.list('-created_date', 100),
      base44.entities.Review.list('-created_date', 500),
      base44.entities.ServiceRequest.list('-created_date', 200),
      base44.entities.Ad.filter({ status: 'Active' }, '-created_date', 20),
    ]);
    const bizMap = {};
    bizData.forEach(b => { bizMap[b.id] = b; });
    setListings(listingsData);
    setBusinesses(bizMap);
    setReviews(reviewsData);
    setRequests(reqsData);
    setAds(adsData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getStats = (businessId) => {
    const bReviews = reviews.filter(r => r.business_id === businessId && r.verified === true);
    const avg = bReviews.length > 0 ? bReviews.reduce((a, r) => a + r.rating, 0) / bReviews.length : 0;
    return { avgRating: avg, reviewCount: bReviews.length };
  };

  const filteredListings = listings
    .filter(l => {
      const matchSearch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        businesses[l.business_id]?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'All' || l.category === category;
      const matchPrice = priceFilter === 'All' || l.price_type === priceFilter;
      const matchLocation = !appliedZip || radius === 'any' || !l.zip_code || l.zip_code === appliedZip;
      return matchSearch && matchCategory && matchPrice && matchLocation;
    })
    .sort((a, b) => {
      // Boosted (non-expired) listings always sort first
      const now = new Date();
      const aBoosted = a.boosted && a.boost_expires_at && new Date(a.boost_expires_at) > now;
      const bBoosted = b.boosted && b.boost_expires_at && new Date(b.boost_expires_at) > now;
      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;
      if (sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'price_asc') {
        const pa = a.price_type === 'Free Quote' ? Infinity : (a.price ?? Infinity);
        const pb = b.price_type === 'Free Quote' ? Infinity : (b.price ?? Infinity);
        return pa - pb;
      }
      if (sortBy === 'highest_rated') {
        const ra = getStats(a.business_id).avgRating;
        const rb = getStats(b.business_id).avgRating;
        if (rb === 0 && ra === 0) return 0;
        if (rb === 0) return -1;
        if (ra === 0) return 1;
        return rb - ra;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="text-white px-6 py-12 text-center" style={{ background: 'linear-gradient(135deg, #1E3245 0%, #2E4A65 100%)' }}>
        {/* Nav link for sellers */}
        <div className="flex justify-end max-w-6xl mx-auto mb-4">
          <Link to="/register">
            <button className="text-sm text-white border border-white/40 rounded-lg px-4 py-1.5 hover:bg-white/10 transition flex items-center gap-1">
              List your services <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="w-7 h-7" />
          <h1 className="text-3xl font-bold">Sphere — Community Hub</h1>
        </div>
        <p className="text-blue-100 text-lg max-w-xl mx-auto mb-6">
          Find trusted local service providers, post what you need, and get quotes instantly.
        </p>
        {/* Search bar */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            className="w-full pl-12 pr-4 py-3 rounded-xl text-slate-900 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search services, providers, categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="browse">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="browse" className="gap-2"><LayoutGrid className="w-4 h-4" /> Browse Services</TabsTrigger>
            <TabsTrigger value="requests" className="gap-2"><ClipboardList className="w-4 h-4" /> Service Requests</TabsTrigger>
          </TabsList>

          {/* BROWSE TAB */}
          <TabsContent value="browse">
            {/* Active Ads */}
            {ads.length > 0 && (
              <div className="mb-6 space-y-3">
                {ads.map(ad => (
                  <AdBanner key={ad.id} ad={ad} business={businesses[ad.business_id]} />
                ))}
              </div>
            )}
            {/* Location filter bar */}
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col sm:flex-row gap-3 mb-3 items-end">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 mb-1">Your zip code</p>
                <Input
                  placeholder="e.g. 78701"
                  value={zipInput}
                  onChange={e => setZipInput(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-44">
                <p className="text-xs font-medium text-slate-500 mb-1">Radius</p>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any distance</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setAppliedZip(zipInput.trim())} style={{ background: '#1E3245', color: '#fff' }}>
                Search
              </Button>
            </div>
            {appliedZip && radius !== 'any' && (
              <p className="text-sm text-slate-500 mb-3">Showing {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} near {appliedZip}</p>
            )}

            {/* Filters row */}
            <div className="bg-white rounded-xl shadow-sm p-3 flex flex-col sm:flex-row gap-3 mb-6">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories ({listings.length})</SelectItem>
                  {LISTING_CATEGORIES.map(c => {
                    const count = listings.filter(l => l.category === c).length;
                    return <SelectItem key={c} value={c}>{c} ({count})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Pricing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All pricing</SelectItem>
                  <SelectItem value="Flat Rate">Fixed price</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Free Quote">Free quote</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price_asc">Lowest price</SelectItem>
                  <SelectItem value="highest_rated">Highest rated</SelectItem>
                </SelectContent>
              </Select>
              {(search || category !== 'All' || priceFilter !== 'All' || sortBy !== 'newest') && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearch(''); setCategory('All'); setPriceFilter('All'); setSortBy('newest'); }}>
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center text-slate-500 py-16">Loading...</div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center text-slate-500 py-16">
                <p className="font-medium">No listings found — try adjusting your filters.</p>
                <p className="text-sm mt-1 text-slate-400">{listings.length} total listings available.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">Showing {filteredListings.length} of {listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredListings.map(l => {
                    const { avgRating, reviewCount } = getStats(l.business_id);
                    return (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        business={businesses[l.business_id]}
                        avgRating={avgRating}
                        reviewCount={reviewCount}
                        onReport={setReportListing}
                        featured={!!(l.boosted && l.boost_expires_at && new Date(l.boost_expires_at) > new Date())}
                      />
                    );
                  })}
                </div>

                {/* Seller acquisition banner */}
                <div className="mt-10 rounded-2xl px-8 py-10 text-center" style={{ background: '#1E3245' }}>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Are you a local service provider?</h2>
                  <p className="text-blue-200 text-base max-w-lg mx-auto mb-2">
                    Join hundreds of local businesses already connecting with customers in your area. Free to get started.
                  </p>
                  <p className="text-blue-300 text-sm mb-6">
                    {listings.length} business{listings.length !== 1 ? 'es' : ''} currently listed
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Link to="/register">
                      <button className="px-6 py-2.5 rounded-lg font-semibold text-white transition" style={{ background: '#E8945A' }}>
                        List your services — it's free
                      </button>
                    </Link>
                    <Link to="/how-it-works">
                      <button className="px-6 py-2.5 rounded-lg font-semibold text-white border border-white/40 hover:bg-white/10 transition">
                        Learn how it works
                      </button>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* SERVICE REQUESTS TAB */}
          <TabsContent value="requests">
            {loading ? (
              <div className="text-center text-slate-500 py-16">Loading...</div>
            ) : (
              <ServiceRequestBoard requests={requests} onRefresh={loadData} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReportDialog
        open={!!reportListing}
        onClose={() => setReportListing(null)}
        targetType="listing"
        targetId={reportListing?.id}
        targetLabel={reportListing?.title}
      />
    </div>
  );
}