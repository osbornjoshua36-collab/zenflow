import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

const TIER_STYLES = {
  Banner: { border: '#E8945A', bg: '#FFF3EA', label: 'Sponsored' },
  Featured: { border: '#7A6AAA', bg: '#EEE8FF', label: 'Featured' },
  Spotlight: { border: '#D4A03A', bg: '#FFF8E4', label: 'Spotlight' },
};

export default function AdBanner({ ad, business }) {
  const style = TIER_STYLES[ad.tier] || TIER_STYLES.Banner;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col sm:flex-row items-stretch shadow-sm"
      style={{ border: `1.5px solid ${style.border}`, background: style.bg }}
    >
      {ad.image_url && (
        <div className="sm:w-48 h-36 sm:h-auto flex-shrink-0">
          <img src={ad.image_url} alt={ad.headline} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5" style={{ color: style.border }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.border }}>
              {style.label}
            </span>
            {business && (
              <span className="text-xs" style={{ color: '#4A6580' }}>· {business.name}</span>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>
            {ad.headline}
          </h3>
          {ad.tagline && (
            <p className="text-sm mt-0.5" style={{ color: '#4A6580' }}>{ad.tagline}</p>
          )}
        </div>
        {business && (
          <Link
            to={`/seller/${business.id}`}
            className="self-start text-sm font-medium px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: style.border, color: '#fff' }}
          >
            {ad.cta_text || 'Learn More'}
          </Link>
        )}
      </div>
    </div>
  );
}