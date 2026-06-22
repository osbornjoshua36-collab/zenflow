import StarRating from '@/components/StarRating';

// ─── Template: BOLD_CRAFT ─────────────────────────────────────────────────────

function BoldCraft({ page, business, reviews }) {
  const accent = page?.accent_color || '#e05c00';
  const heroStyle = page?.hero_image_url
    ? { backgroundImage: `linear-gradient(rgba(26,26,26,0.75),rgba(26,26,26,0.88)), url(${page.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: '#1a1a1a' };

  return (
    <div className="min-h-screen font-sans" style={{ fontFamily: 'system-ui, sans-serif', background: '#f4f4f4' }}>
      {/* Hero */}
      <section style={heroStyle} className="text-white px-6 py-20 text-center">
        {business?.logo_url && <img src={business.logo_url} className="w-16 h-16 rounded-lg object-cover mx-auto mb-6 border-2 border-white/20" />}
        <h1 className="text-4xl font-black leading-tight mb-4" style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 900 }}>
          {page?.hero_headline || business?.business_name || 'Professional Services'}
        </h1>
        <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">{page?.hero_subheadline || 'Serving your local area'}</p>
        <button className="px-8 py-3 rounded-md font-bold text-white text-lg" style={{ background: accent }}>
          {page?.hero_cta_label || 'Get a Free Quote'}
        </button>
      </section>

      {/* Trust bar */}
      {(page?.trust_stats || []).filter(s => s.label || s.value).length > 0 && (
        <div className="py-5 px-6 flex flex-wrap justify-center gap-8" style={{ background: '#111' }}>
          {(page.trust_stats).filter(s => s.label || s.value).map((s, i) => (
            <div key={i} className="text-center text-white">
              <span className="font-bold text-xl">{s.value}</span>
              <span className="text-slate-400 ml-2 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Services */}
      {(page?.services || []).length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-black mb-10 text-slate-900">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {page.services.map(s => (
              <div key={s.id} className="bg-white border-2 border-slate-200 rounded-lg p-5" style={{ borderLeftColor: accent, borderLeftWidth: 4 }}>
                <div className="text-3xl mb-3">{s.emoji || '🔧'}</div>
                <h3 className="font-bold text-slate-900 mb-1">{s.name}</h3>
                <p className="text-sm text-slate-500">{s.description}</p>
                {s.price && <p className="mt-2 text-sm font-semibold" style={{ color: accent }}>{s.price}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {(page?.gallery_images || []).filter(Boolean).length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-3xl font-black mb-6 text-slate-900">Our Work</h2>
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {page.gallery_images.filter(Boolean).map((url, i) => (
              <img key={i} src={url} className="w-full rounded-lg object-cover break-inside-avoid" style={{ maxHeight: 220 }} />
            ))}
          </div>
        </section>
      )}

      <AboutAndReviewsSection page={page} business={business} reviews={reviews} accent={accent} />
      <ContactSection page={page} accent={accent} />
      <PoweredByBadge />
    </div>
  );
}

// ─── Template: CLEAN_PRO ──────────────────────────────────────────────────────

function CleanPro({ page, business, reviews }) {
  const accent = page?.accent_color || '#0d2b45';

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Georgia, serif', background: '#fff' }}>
      {/* Hero — split layout */}
      <section className="flex flex-col lg:flex-row min-h-[420px]">
        <div className="flex-1 flex flex-col justify-center px-10 py-16" style={{ background: '#fff' }}>
          {business?.logo_url && <img src={business.logo_url} className="w-12 h-12 rounded object-cover mb-6" />}
          <h1 className="text-4xl font-bold leading-snug mb-4" style={{ color: accent }}>
            {page?.hero_headline || business?.business_name || 'Professional Services'}
          </h1>
          <p className="text-slate-500 mb-8 text-lg leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {page?.hero_subheadline || 'Serving your local area with excellence'}
          </p>
          <button className="self-start px-8 py-3 rounded font-semibold text-white text-base" style={{ background: accent, fontFamily: 'system-ui, sans-serif' }}>
            {page?.hero_cta_label || 'Book a Consultation'}
          </button>
        </div>
        {page?.hero_image_url ? (
          <div className="lg:w-2/5 min-h-[280px]" style={{ backgroundImage: `url(${page.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div className="lg:w-2/5 min-h-[280px]" style={{ background: `linear-gradient(135deg, #4a7c59 0%, ${accent} 100%)` }} />
        )}
      </section>

      {/* Services — 2 col, minimal */}
      {(page?.services || []).length > 0 && (
        <section className="max-w-4xl mx-auto px-8 py-16">
          <h2 className="text-3xl font-bold mb-10" style={{ color: accent }}>What We Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {page.services.map(s => (
              <div key={s.id} className="border border-slate-200 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-1 text-lg" style={{ fontFamily: 'system-ui, sans-serif' }}>{s.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>{s.description}</p>
                {s.price && <p className="mt-3 text-sm font-semibold" style={{ color: accent, fontFamily: 'system-ui, sans-serif' }}>{s.price}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* About */}
      {page?.about_text && (
        <section className="max-w-4xl mx-auto px-8 py-12 flex flex-col sm:flex-row gap-10 items-center">
          {page?.about_image_url && <img src={page.about_image_url} className="w-32 h-32 sm:w-48 sm:h-48 rounded-full object-cover flex-shrink-0" />}
          <div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: accent }}>About Us</h2>
            <p className="text-slate-600 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>{page.about_text}</p>
          </div>
        </section>
      )}

      {/* Reviews */}
      <ReviewsSection reviews={reviews} accent={accent} />

      {/* Trust row in footer area */}
      {(page?.trust_stats || []).filter(s => s.label).length > 0 && (
        <div className="border-t py-6 px-8 flex flex-wrap justify-center gap-8" style={{ background: '#f9fafb' }}>
          {page.trust_stats.filter(s => s.label).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-600" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <span className="font-bold" style={{ color: accent }}>{s.value}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <ContactSection page={page} accent={accent} />
      <PoweredByBadge />
    </div>
  );
}

// ─── Template: WARM_LOCAL ─────────────────────────────────────────────────────

function WarmLocal({ page, business, reviews }) {
  const accent = page?.accent_color || '#c0614a';
  const heroStyle = page?.hero_image_url
    ? { backgroundImage: `linear-gradient(135deg, rgba(255,248,240,0.92), rgba(245,230,218,0.85)), url(${page.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #fff8f0 0%, #f5e6da 100%)' };

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, sans-serif', background: '#fefefe' }}>
      {/* Hero */}
      <section style={heroStyle} className="px-6 py-20 text-center">
        {page?.about_image_url && (
          <img src={page.about_image_url} className="w-24 h-24 rounded-full object-cover mx-auto mb-6 border-4 border-white shadow" />
        )}
        {!page?.about_image_url && business?.logo_url && (
          <img src={business.logo_url} className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-4 border-white shadow" />
        )}
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#2d2d2d', fontWeight: 800 }}>
          {page?.hero_headline || `Hi, I'm ${business?.owner_first_name || 'here to help'}!`}
        </h1>
        <p className="text-slate-500 text-lg mb-8 max-w-lg mx-auto">{page?.hero_subheadline || 'Your trusted local service provider'}</p>
        <button className="px-8 py-3 rounded-full font-bold text-white text-base shadow" style={{ background: accent }}>
          {page?.hero_cta_label || 'Book Now'}
        </button>
      </section>

      {/* Reviews near top */}
      {reviews.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#2d2d2d' }}>What People Are Saying</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviews.slice(0, 4).map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 border border-orange-100">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: r.rating }).map((_, i) => <span key={i} style={{ color: accent }}>★</span>)}
                </div>
                {r.text && <p className="text-sm text-slate-600 italic">"{r.text.slice(0, 140)}{r.text.length > 140 ? '…' : ''}"</p>}
                <p className="text-xs text-slate-400 mt-2">— Verified customer</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services — rounded, emoji-forward */}
      {(page?.services || []).length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#2d2d2d' }}>What I Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {page.services.map(s => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm p-5 border border-orange-50">
                <div className="text-3xl mb-2">{s.emoji || '✨'}</div>
                <h3 className="font-bold text-slate-800 mb-1">{s.name}</h3>
                <p className="text-sm text-slate-500">{s.description}</p>
                {s.price && <p className="mt-2 text-sm font-semibold" style={{ color: accent }}>{s.price}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery — horizontal scroll strip */}
      {(page?.gallery_images || []).filter(Boolean).length > 0 && (
        <section className="py-8">
          <h2 className="text-2xl font-bold mb-5 px-6" style={{ color: '#2d2d2d' }}>Our Work</h2>
          <div className="flex gap-3 overflow-x-auto px-6 pb-3">
            {page.gallery_images.filter(Boolean).map((url, i) => (
              <img key={i} src={url} className="h-44 w-60 object-cover rounded-2xl flex-shrink-0 shadow-sm" />
            ))}
          </div>
        </section>
      )}

      {/* About — owner forward */}
      {page?.about_text && (
        <section className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2d2d2d' }}>
            Hi, I'm {business?.owner_first_name || 'the Owner'} 👋
          </h2>
          <p className="text-slate-600 leading-relaxed text-base">{page.about_text}</p>
        </section>
      )}

      <ContactSection page={page} accent={accent} />
      <PoweredByBadge />
    </div>
  );
}

// ─── Shared sub-sections ──────────────────────────────────────────────────────

function AboutAndReviewsSection({ page, business, reviews, accent }) {
  return (
    <>
      {page?.about_text && (
        <section className="max-w-5xl mx-auto px-6 py-12 flex flex-col sm:flex-row gap-8 items-center">
          {page?.about_image_url && <img src={page.about_image_url} className="w-40 h-40 rounded-xl object-cover flex-shrink-0" />}
          <div>
            <h2 className="text-2xl font-black mb-3 text-slate-900">About Us</h2>
            <p className="text-slate-600 leading-relaxed">{page.about_text}</p>
          </div>
        </section>
      )}
      <ReviewsSection reviews={reviews} accent={accent} />
    </>
  );
}

function ReviewsSection({ reviews, accent }) {
  if (!reviews || reviews.length === 0) return null;
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold mb-6 text-slate-900">Customer Reviews</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.slice(0, 6).map(r => (
          <div key={r.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: r.rating }).map((_, i) => <span key={i} style={{ color: accent || '#e05c00' }}>★</span>)}
            </div>
            {r.text && <p className="text-sm text-slate-700 italic">"{r.text.slice(0, 140)}{r.text.length > 140 ? '…' : ''}"</p>}
            <p className="text-xs text-slate-400 mt-2">— Verified customer</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactSection({ page, accent }) {
  return (
    <section className="py-14 px-6 text-center" style={{ background: accent, color: '#fff' }}>
      <h2 className="text-3xl font-bold mb-3">Ready to Get Started?</h2>
      {page?.contact_area_text && <p className="mb-4 opacity-90">Serving {page.contact_area_text}</p>}
      <div className="flex flex-wrap justify-center gap-4 text-sm mt-4">
        {page?.contact_phone && <a href={`tel:${page.contact_phone}`} className="underline opacity-90">{page.contact_phone}</a>}
        {page?.contact_email && <a href={`mailto:${page.contact_email}`} className="underline opacity-90">{page.contact_email}</a>}
      </div>
    </section>
  );
}

function PoweredByBadge() {
  return (
    <div className="text-center py-4 bg-slate-50 border-t">
      <span className="text-xs text-slate-400">Powered by <span className="font-semibold text-slate-500">Sphere</span></span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BusinessPagePreview({ page, business, reviews = [], isPreview = false }) {
  const template = page?.template || 'BOLD_CRAFT';

  const wrapper = (
    <div className={isPreview ? 'scale-[0.75] origin-top-left w-[133%]' : ''}>
      {template === 'BOLD_CRAFT' && <BoldCraft page={page} business={business} reviews={reviews} />}
      {template === 'CLEAN_PRO' && <CleanPro page={page} business={business} reviews={reviews} />}
      {template === 'WARM_LOCAL' && <WarmLocal page={page} business={business} reviews={reviews} />}
    </div>
  );

  return isPreview ? (
    <div className="overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      {wrapper}
    </div>
  ) : wrapper;
}