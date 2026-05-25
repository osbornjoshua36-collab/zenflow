import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function ModuleC({ seller, onComplete, onSkip, skipLabel, onSellerUpdate }) {
  const [form, setForm] = useState({
    business_address_line1: seller?.business_address_line1 || '',
    business_address_line2: seller?.business_address_line2 || '',
    business_city: seller?.business_city || '',
    business_state: seller?.business_state || '',
    business_zip: seller?.business_zip || '',
    service_radius_miles: seller?.service_radius_miles ?? 25,
    service_area_description: seller?.service_area_description || '',
  });
  const [mapCenter, setMapCenter] = useState(null);
  const [geocodeError, setGeocodeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [MapComponent, setMapComponent] = useState(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); onSellerUpdate({ [k]: v }); };

  const geocodeZip = async () => {
    if (form.business_zip.length !== 5 || !/^\d{5}$/.test(form.business_zip)) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${form.business_zip}&country=US&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setGeocodeError('');
      } else {
        setGeocodeError("We couldn't find this address — please check the ZIP code.");
      }
    } catch {
      setGeocodeError("We couldn't find this address — please check the ZIP code.");
    }
  };

  // Lazy-load the map component to avoid SSR issues
  useEffect(() => {
    import('./MapPreview').then(m => setMapComponent(() => m.default)).catch(() => {});
  }, []);

  const canSave = form.business_address_line1 && form.business_city && form.business_state && /^\d{5}$/.test(form.business_zip);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      business_address_line1: form.business_address_line1,
      business_address_line2: form.business_address_line2,
      business_city: form.business_city,
      business_state: form.business_state,
      business_zip: form.business_zip,
      service_radius_miles: parseInt(form.service_radius_miles),
      service_area_description: form.service_area_description,
    };
    await base44.entities.Business.update(seller.id, updates);
    await onComplete(updates);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'var(--font-fraunces)' }}>Service area</h2>
        <p className="text-sm text-slate-500">Where are you based and how far will you travel?</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">Street address *</Label>
        <Input className="mt-1" value={form.business_address_line1} onChange={e => set('business_address_line1', e.target.value)} maxLength={100} />
      </div>
      <div>
        <Label className="text-sm font-medium text-slate-700">Suite / unit (optional)</Label>
        <Input className="mt-1" value={form.business_address_line2} onChange={e => set('business_address_line2', e.target.value)} maxLength={100} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">City *</Label>
          <Input className="mt-1" value={form.business_city} onChange={e => set('business_city', e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">State *</Label>
          <Select value={form.business_state} onValueChange={v => set('business_state', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">ZIP code *</Label>
        <Input
          className="mt-1 max-w-xs" value={form.business_zip}
          onChange={e => set('business_zip', e.target.value.replace(/\D/g,'').slice(0,5))}
          onBlur={geocodeZip}
          placeholder="27601"
        />
        {geocodeError && <p className="text-xs text-amber-600 mt-1">{geocodeError}</p>}
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">
          Serving within {form.service_radius_miles} miles of your address *
        </Label>
        <input
          type="range" min={1} max={100} value={form.service_radius_miles}
          onChange={e => set('service_radius_miles', parseInt(e.target.value))}
          className="w-full mt-2 accent-[#E8945A]"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1 mi</span><span>50 mi</span><span>100 mi</span>
        </div>
      </div>

      {/* Map preview */}
      {mapCenter && MapComponent && (
        <MapComponent center={mapCenter} radius={form.service_radius_miles} />
      )}
      {!mapCenter && (
        <div className="bg-slate-100 rounded-xl h-40 flex items-center justify-center text-xs text-slate-400">
          Enter your ZIP code to see your coverage area on a map
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-slate-700">Service area note (optional)</Label>
          <span className="text-xs text-slate-400">{form.service_area_description.length} / 300</span>
        </div>
        <Textarea
          value={form.service_area_description}
          onChange={e => set('service_area_description', e.target.value)}
          maxLength={300} rows={3} className="resize-none"
          placeholder="e.g. We cover all of Wake County and surrounding areas"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onSkip && <Button variant="outline" onClick={onSkip} className="flex-1 text-sm">{skipLabel}</Button>}
        <Button onClick={handleSave} disabled={!canSave || saving} className="flex-1" style={{ background: '#E8945A', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save and continue →'}
        </Button>
      </div>
    </div>
  );
}