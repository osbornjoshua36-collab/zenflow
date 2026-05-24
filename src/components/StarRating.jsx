// Reusable star rating display with partial fill support
export default function StarRating({ avgRating, reviewCount, size = 'sm' }) {
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const textClass = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  if (!reviewCount || reviewCount === 0) {
    return <span className={`${textClass} text-slate-400`}>No reviews yet</span>;
  }

  const rating = avgRating ?? 0;
  const fullStars = Math.floor(rating);
  const partial = rating - fullStars; // 0.0 – 0.99
  const emptyStars = 5 - fullStars - (partial > 0 ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#D4A03A" stroke="#D4A03A" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      {/* Partial star */}
      {partial > 0 && (
        <span className="relative inline-block" style={{ width: iconSize, height: iconSize }}>
          {/* Empty star underneath */}
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#D4A03A" strokeWidth="1.5" style={{ position: 'absolute', top: 0, left: 0 }}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
          {/* Filled star clipped to partial width */}
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#D4A03A" stroke="#D4A03A" strokeWidth="1.5"
            style={{ position: 'absolute', top: 0, left: 0, clipPath: `inset(0 ${(1 - partial) * 100}% 0 0)` }}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </span>
      )}
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#D4A03A" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span className={`${textClass} font-medium text-slate-700`}>{rating.toFixed(1)}</span>
      <span className={`${textClass} text-slate-400`}>({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
    </span>
  );
}