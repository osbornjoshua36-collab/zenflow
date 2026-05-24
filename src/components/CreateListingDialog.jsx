import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LISTING_CATEGORIES } from '@/lib/categories';
import { X } from 'lucide-react';

const CATEGORIES = LISTING_CATEGORIES;
const STEPS = ['Basics', 'Details', 'Pricing', 'Publish'];

export default function CreateListingDialog({ open, onClose, onCreated, businessId, existing }) {
  const empty = { title: '', category: '', description: '', price_type: 'Free Quote', price: '', location: '', service_area_miles: 25, city: '', state: '', zip_code: '', service_radius_miles: 25, seller_about: '', years_experience: '', certifications: '', tags: [], images: [], status: 'Active' };
  const [form, setForm] = useState(existing || empty);
  const [step, setStep] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const handlePhotoUpload = async (files) => {
    const urls = [];
    for (const file of files) {
      const res = await base44.integrations.Core.UploadFile({ file });
      urls.push(res.file_url);
    }
    set('photos', [...(form.photos || []), ...urls]);
    setPhotoFiles([]);
  };

  const [uploadingImages, setUploadingImages] = useState(false);
  const handleImageUpload = async (files) => {
    const current = form.images || [];
    const slots = 8 - current.length;
    if (slots <= 0) return;
    setUploadingImages(true);
    const toUpload = Array.from(files).slice(0, slots);
    const urls = [];
    for (const file of toUpload) {
      const res = await base44.integrations.Core.UploadFile({ file });
      urls.push(res.file_url);
    }
    set('images', [...current, ...urls]);
    setUploadingImages(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.category) return;
    setLoading(true);
    const data = { ...form, business_id: businessId, price: form.price ? parseFloat(form.price) : 0 };
    if (existing?.id) {
      await base44.entities.Listing.update(existing.id, data);
    } else {
      await base44.entities.Listing.create(data);
    }
    setLoading(false);
    setForm(empty);
    setStep(0);
    onCreated();
    onClose();
  };

  const steps = [
    // Step 0: Basics
    <div key="basics" className="space-y-3">
      <div>
        <Label>Listing Title*</Label>
        <Input placeholder="e.g. Professional Lawn Care & Maintenance" value={form.title} onChange={e => set('title', e.target.value)} />
      </div>
      <div>
        <Label>Category*</Label>
        <Select value={form.category} onValueChange={v => set('category', v)}>
          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {existing && form.category && !CATEGORIES.includes(form.category) && (
          <p className="text-xs text-amber-600 mt-1">⚠ Please update category to a standard value.</p>
        )}
      </div>
      <div>
        <Label>Description*</Label>
        <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Describe your service in detail..."
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      {/* Photos */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-0.5">Photos <span className="font-normal text-slate-400">(optional — up to 8 images)</span></p>
        <p className="text-xs text-slate-400 mb-2">Photos significantly increase buyer interest</p>
        {(form.images || []).length < 8 && (
          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <span className="text-xs text-slate-400">{uploadingImages ? 'Uploading…' : '+ Add photos (jpg, png, webp)'}</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
              disabled={uploadingImages}
              onChange={e => handleImageUpload(Array.from(e.target.files))} />
          </label>
        )}
        {(form.images || []).length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {form.images.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} className="w-full h-full object-cover rounded-lg" />
                <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Service Location */}
      <div className="pt-1">
        <p className="text-sm font-semibold text-slate-700 mb-2">Service Location</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label>City</Label>
            <Input placeholder="e.g. Austin" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
          <div>
            <Label>State</Label>
            <Input placeholder="e.g. TX" maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Zip Code</Label>
            <Input placeholder="e.g. 78701" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} />
          </div>
          <div>
            <Label>Service radius (miles)</Label>
            <Input type="number" placeholder="25" value={form.service_radius_miles} onChange={e => set('service_radius_miles', parseInt(e.target.value) || 25)} />
          </div>
        </div>
      </div>
    </div>,

    // Step 1: Details
    <div key="details" className="space-y-3">
      <div>
        <Label>About You / Seller Story</Label>
        <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Tell buyers about yourself and your experience..."
          value={form.seller_about} onChange={e => set('seller_about', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Years of Experience</Label>
          <Input type="number" placeholder="5" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} />
        </div>
        <div>
          <Label>Certifications</Label>
          <Input placeholder="e.g. Licensed, Insured" value={form.certifications} onChange={e => set('certifications', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Tags (press Enter to add)</Label>
        <div className="flex gap-2">
          <Input placeholder="e.g. residential, fast response" value={tagInput}
            onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {form.tags.map(t => (
            <Badge key={t} variant="secondary" className="gap-1">{t}
              <X className="w-3 h-3 cursor-pointer" onClick={() => set('tags', form.tags.filter(x => x !== t))} />
            </Badge>
          ))}
        </div>
      </div>
    </div>,

    // Step 2: Pricing & Location
    <div key="pricing" className="space-y-3">
      <div>
        <Label>Pricing Type*</Label>
        <Select value={form.price_type} onValueChange={v => set('price_type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Free Quote">Free Quote (No price listed)</SelectItem>
            <SelectItem value="Flat Rate">Flat Rate</SelectItem>
            <SelectItem value="Hourly">Hourly Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.price_type !== 'Free Quote' && (
        <div>
          <Label>Starting Price ($)</Label>
          <Input type="number" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
      )}
      <div>
        <Label>Your Location / City</Label>
        <Input placeholder="e.g. Austin, TX" value={form.location} onChange={e => set('location', e.target.value)} />
      </div>
      <div>
        <Label>Service Radius (miles)</Label>
        <Input type="number" placeholder="25" value={form.service_area_miles} onChange={e => set('service_area_miles', parseInt(e.target.value))} />
      </div>
    </div>,

    // Step 3: Publish
    <div key="publish" className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
        <p className="font-semibold text-slate-800">{form.title || 'Untitled Listing'}</p>
        <p className="text-slate-500">{form.category} · {form.price_type === 'Free Quote' ? 'Free Quote' : `$${form.price}${form.price_type === 'Hourly' ? '/hr' : ''}`}</p>
        <p className="text-slate-600 line-clamp-3">{form.description}</p>
      </div>
      <div>
        <Label>Listing Status</Label>
        <Select value={form.status} onValueChange={v => set('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active — Visible to buyers</SelectItem>
            <SelectItem value="Draft">Draft — Save for later</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>,
  ];

  return (
    <Dialog open={open} onOpenChange={() => { setStep(0); onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Listing' : 'Create a New Listing'}</DialogTitle>
          {/* Step indicator */}
          <div className="flex gap-1 pt-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 text-center">
                <div className={`h-1.5 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <span className="text-xs text-slate-400 mt-1 block">{s}</span>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-2">{steps[step]}</div>

        <div className="flex justify-between gap-2 pt-2">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && (!form.title || !form.category)}>
              Next →
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : existing ? 'Save Changes' : 'Publish Listing'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}