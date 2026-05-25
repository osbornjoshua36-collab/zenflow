import { ArrowLeft, X } from 'lucide-react';

const HEADLINES = {
  leads: "Almost ready to receive your first job request",
  profile: "Your online presence is taking shape",
  operations: "Your business workspace is nearly ready",
};

export default function WizardChrome({ currentStep, stepName, intent, seller, onBack, onSaveExit, showResumeBanner, onDismissResume, children }) {
  const totalSteps = 6;
  const displayStep = Math.min(currentStep, totalSteps);
  const headline = intent ? HEADLINES[intent] : null;

  return (
    <div className="min-h-screen bg-[#FAFCFF] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="w-28">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : null}
        </div>
        <div className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'var(--font-fraunces)' }}>
          {seller?.business_name || seller?.name || 'Getting started'}
        </div>
        <div className="w-28 text-right">
          {onSaveExit && (
            <button onClick={onSaveExit} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Save and exit
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {currentStep <= totalSteps && (
        <div className="bg-white border-b border-slate-100 px-6 py-3">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <div className="flex gap-1.5 mb-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i + 1 < displayStep ? 'bg-[#E8945A]' : i + 1 === displayStep ? 'bg-[#E8945A] opacity-80' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Step {displayStep} of {totalSteps} — {stepName}</span>
              {headline && <span className="text-xs text-[#E8945A] font-medium hidden md:block">{headline}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between">
          <span className="text-sm text-blue-700">Welcome back — pick up where you left off</span>
          <button onClick={onDismissResume} className="text-blue-400 hover:text-blue-600 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {children}
            {seller?.id && (
              <div className="mt-8 text-center">
                <a href={`/seller/${seller.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                  Preview my storefront
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Live preview panel - desktop only */}
        <div className="hidden lg:flex w-80 xl:w-96 border-l border-slate-100 bg-white flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Live Preview</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <StorefrontPreview seller={seller} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StorefrontPreview({ seller }) {
  if (!seller) {
    return <p className="text-xs text-slate-400 text-center mt-12 leading-relaxed">Your storefront preview will appear here as you fill in your profile.</p>;
  }
  const name = seller.business_name || seller.name || 'Your business';
  return (
    <div className="space-y-4 text-sm">
      {seller.banner_image_url ? (
        <img src={seller.banner_image_url} alt="Banner" className="w-full h-24 object-cover rounded-lg" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
          <span className="text-xs text-slate-400">Cover photo</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        {seller.logo_url ? (
          <img src={seller.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#E8945A]/20 flex items-center justify-center text-[#E8945A] text-lg font-bold">{name[0]}</div>
        )}
        <div>
          <p className="font-semibold text-slate-800">{name}</p>
          {seller.tagline && <p className="text-xs text-slate-500 mt-0.5">{seller.tagline}</p>}
        </div>
      </div>
      {seller.business_description && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{seller.business_description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        {seller.business_city && seller.business_state && (
          <span>📍 {seller.business_city}, {seller.business_state}</span>
        )}
        {seller.service_radius_miles && (
          <span>· {seller.service_radius_miles}mi radius</span>
        )}
        {seller.years_in_business > 0 && (
          <span>· {seller.years_in_business} yr{seller.years_in_business !== 1 ? 's' : ''} in business</span>
        )}
      </div>
      {seller.portfolio_images?.length > 0 && (
        <div className="grid grid-cols-3 gap-1">
          {seller.portfolio_images.slice(0, 6).map((url, i) => (
            <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  );
}