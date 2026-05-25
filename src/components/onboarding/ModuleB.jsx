import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function UploadZone({ label, helper, value, onUpload, onRemove, uploading, error, preview }) {
  const ref = useRef();
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onUpload(f); };
  const handleChange = (e) => { const f = e.target.files[0]; if (f) onUpload(f); };

  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-1">{label}</p>
      {value ? (
        <div className="relative group">
          {preview === 'circle'
            ? <img src={value} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
            : <img src={value} alt="" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
          }
          <button onClick={onRemove} className="absolute top-2 right-2 bg-white border border-slate-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#E8945A] hover:bg-orange-50 transition-colors"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400 mb-2" /> : <Upload className="w-5 h-5 text-slate-400 mb-2" />}
          <p className="text-sm text-slate-500">Drag and drop or click to upload</p>
          <input ref={ref} type="file" accept="image/*" onChange={handleChange} className="hidden" />
        </div>
      )}
      {helper && <p className="text-xs text-slate-400 mt-1">{helper}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ModuleB({ seller, onComplete, onSkip, skipLabel, isProfilePath, onSellerUpdate }) {
  const [logoUrl, setLogoUrl] = useState(seller?.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(seller?.banner_image_url || '');
  const [portfolio, setPortfolio] = useState(seller?.portfolio_images || []);
  const [uploading, setUploading] = useState({ logo: false, banner: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const portfolioRef = useRef();

  const uploadFile = async (file, key, maxMB) => {
    if (file.size > maxMB * 1024 * 1024) {
      setErrors(e => ({ ...e, [key]: `File must be under ${maxMB}MB` }));
      return null;
    }
    setErrors(e => ({ ...e, [key]: undefined }));
    setUploading(u => ({ ...u, [key]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(u => ({ ...u, [key]: false }));
    return file_url;
  };

  const handleLogoUpload = async (file) => {
    const url = await uploadFile(file, 'logo', 5);
    if (url) { setLogoUrl(url); onSellerUpdate({ logo_url: url }); }
  };

  const handleBannerUpload = async (file) => {
    const url = await uploadFile(file, 'banner', 10);
    if (url) { setBannerUrl(url); onSellerUpdate({ banner_image_url: url }); }
  };

  const handlePortfolioFiles = async (files) => {
    for (const file of Array.from(files)) {
      if (portfolio.length >= 12) break;
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        setPortfolio(p => { const next = [...p, file_url]; onSellerUpdate({ portfolio_images: next }); return next; });
      }
    }
  };

  const removePortfolioImage = (idx) => {
    setPortfolio(p => { const next = p.filter((_, i) => i !== idx); onSellerUpdate({ portfolio_images: next }); return next; });
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = { logo_url: logoUrl, banner_image_url: bannerUrl, portfolio_images: portfolio };
    await base44.entities.Business.update(seller.id, updates);
    await onComplete(updates);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Brand and media</h2>
        <p className="text-sm text-slate-500">Add your logo, cover photo, and portfolio images.</p>
      </div>

      {isProfilePath && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700 font-medium">Your profile is your online presence.</p>
          <p className="text-xs text-blue-600 mt-1">Sellers with a logo and cover photo get significantly more views than those without.</p>
        </div>
      )}

      <UploadZone
        label="Your logo"
        helper="Used on your storefront, invoices, and messages. Square images work best."
        value={logoUrl}
        onUpload={handleLogoUpload}
        onRemove={() => { setLogoUrl(''); onSellerUpdate({ logo_url: '' }); }}
        uploading={uploading.logo}
        error={errors.logo}
        preview="circle"
      />

      <UploadZone
        label="Cover photo"
        helper="Displayed across the top of your storefront. 1200 x 300px recommended."
        value={bannerUrl}
        onUpload={handleBannerUpload}
        onRemove={() => { setBannerUrl(''); onSellerUpdate({ banner_image_url: '' }); }}
        uploading={uploading.banner}
        error={errors.banner}
        preview="wide"
      />

      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">
          Portfolio photos <span className="text-xs text-slate-400">({portfolio.length}/12)</span>
        </p>
        {portfolio.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {portfolio.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                {i === 0 && <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>}
                <button onClick={() => removePortfolioImage(i)} className="absolute top-1 right-1 bg-white border border-slate-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}
        {portfolio.length < 12 && (
          <div
            onClick={() => portfolioRef.current?.click()}
            onDrop={e => { e.preventDefault(); handlePortfolioFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-[#E8945A] hover:bg-orange-50 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-sm text-slate-500">Add photos (JPG/PNG, max 5MB each)</span>
            <input ref={portfolioRef} type="file" accept="image/jpeg,image/png" multiple onChange={e => handlePortfolioFiles(e.target.files)} className="hidden" />
          </div>
        )}
        {errors.portfolio && <p className="text-xs text-red-500 mt-1">{errors.portfolio}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        {onSkip && <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>}
        <Button onClick={handleSave} disabled={saving} className="flex-1" style={{ background: '#E8945A', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save and continue →'}
        </Button>
      </div>
    </div>
  );
}