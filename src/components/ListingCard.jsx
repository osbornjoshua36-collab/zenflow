import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, CheckCircle2 } from 'lucide-react';
import StarRating from '@/components/StarRating';
import { Link } from 'react-router-dom';

export default function ListingCard({ listing, business, avgRating, reviewCount, onClick, onReport, featured }) {
  const priceLabel = listing.price_type === 'Free Quote'
    ? 'Free Quote'
    : listing.price_type === 'Hourly'
      ? `$${listing.price}/hr`
      : `$${listing.price}`;

  const card = (
    <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group relative">
      {featured && (
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-terracotta text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
          <span>⭐</span> Featured
        </span>
      )}
      {/* Photo */}
      {(() => {
        const thumb = listing.images?.[0] || listing.photos?.[0];
        return thumb ? (
          <div className="aspect-[4/3] overflow-hidden">
            <img src={thumb} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <span className="text-sm font-medium text-slate-400 text-center px-3">{listing.category}</span>
          </div>
        );
      })()}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{listing.title}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">{listing.category}</Badge>
        </div>
        {business && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <p className="text-xs text-slate-500">{business.name}</p>
            {business.phone_verified && (
              <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Phone verified
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{listing.description}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location || 'Location TBD'}</span>
          <span className="flex items-center gap-1 font-semibold text-slate-800"><DollarSign className="w-3 h-3" />{priceLabel}</span>
        </div>
        <div className="mt-2">
          <StarRating avgRating={avgRating} reviewCount={reviewCount} size="sm" />
        </div>
        {onReport && (
          <div className="mt-2 text-right">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onReport(listing); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline-offset-2 hover:underline"
            >
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) return <div onClick={onClick}>{card}</div>;
  return <Link to={`/seller/${listing.business_id}`}>{card}</Link>;
}