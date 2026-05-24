import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Star, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ListingCard({ listing, business, avgRating, reviewCount, onClick }) {
  const priceLabel = listing.price_type === 'Free Quote'
    ? 'Free Quote'
    : listing.price_type === 'Hourly'
      ? `$${listing.price}/hr`
      : `$${listing.price}`;

  const card = (
    <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
      {/* Photo */}
      {listing.photos?.length > 0 ? (
        <div className="h-40 overflow-hidden">
          <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <span className="text-3xl">🛠️</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{listing.title}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">{listing.category}</Badge>
        </div>
        {business && (
          <p className="text-xs text-slate-500 mb-2">{business.name}</p>
        )}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{listing.description}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location || 'Location TBD'}</span>
          <span className="flex items-center gap-1 font-semibold text-slate-800"><DollarSign className="w-3 h-3" />{priceLabel}</span>
        </div>
        {(avgRating > 0 || reviewCount > 0) && (
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
            <span>{avgRating?.toFixed(1)} ({reviewCount} reviews)</span>
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) return <div onClick={onClick}>{card}</div>;
  return <Link to={`/seller/${listing.business_id}`}>{card}</Link>;
}