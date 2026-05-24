import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Star, Clock, ChevronLeft, CheckCircle2 } from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import QuoteRequestDialog from '@/components/QuoteRequestDialog';
import ReportDialog from '@/components/ReportDialog';

export default function SellerStorefront() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [biz, allListings, allReviews] = await Promise.all([
        base44.entities.Business.filter({ id: businessId }),
        base44.entities.Listing.filter({ business_id: businessId, status: 'Active' }),
        base44.entities.Review.filter({ business_id: businessId }),
      ]);
      setBusiness(biz[0] || null);
      setListings(allListings);
      setReviews(allReviews);
      setLoading(false);
    };
    load();
  }, [businessId]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!business) return <div className="text-center py-16 text-slate-500">Business not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back nav */}
      <div className="bg-white border-b px-6 py-3">
        <Link to="/community" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Community Hub
        </Link>
      </div>

      {/* Hero / Profile Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start gap-6">
          {business.logo_url ? (
            <img src={business.logo_url} className="w-20 h-20 rounded-xl object-cover border-2 border-white/20" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-blue-600 flex items-center justify-center text-3xl font-bold border-2 border-white/20">
              {business.name?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{business.name}</h1>
              {business.status === 'Active' && <Badge className="bg-green-500 text-white border-0">Active</Badge>}
              {business.phone_verified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-300 bg-green-900/40 border border-green-700/50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Phone verified
                </span>
              )}
            </div>
            <p className="text-slate-300 mt-1">{business.industry}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-300">
              {business.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{business.phone}</span>}
              {business.timezone && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{business.timezone}</span>}
              {avgRating > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" /> {avgRating.toFixed(1)} ({reviews.length} reviews)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Listings */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Services Offered</h2>
          {listings.length === 0 ? (
            <p className="text-slate-500">No active listings from this provider.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  business={business}
                  avgRating={avgRating}
                  reviewCount={reviews.length}
                  onClick={() => setSelectedListing(l)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {reviews.slice(0, 5).map(r => (
                <div key={r.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-4 h-4 ${i <= r.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-300'}`} />
                    ))}
                    <span className="text-xs text-slate-400 ml-auto">{new Date(r.created_date).toLocaleDateString()}</span>
                  </div>
                  {r.text && <p className="text-sm text-slate-700">{r.text}</p>}
                  {r.platform && <p className="text-xs text-slate-400 mt-1">via {r.platform}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Report link */}
        <div className="text-right pb-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline-offset-2 hover:underline"
          >
            Report this seller
          </button>
        </div>
      </div>

      {selectedListing && (
        <QuoteRequestDialog
          open={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          listing={selectedListing}
          business={business}
        />
      )}

      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        targetType="seller"
        targetId={businessId}
        targetLabel={business?.name}
      />
    </div>
  );
}