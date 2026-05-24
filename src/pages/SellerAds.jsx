import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, MousePointer, Zap, Pause, Play, Trash2 } from 'lucide-react';

const TIERS = [
  { value: 'Banner', label: 'Banner', price: '$49 / month', desc: 'Full-width banner at the top of Community Hub' },
  { value: 'Featured', label: 'Featured', price: '$29 / month', desc: 'Featured card in the Browse Services section' },
  { value: 'Spotlight', label: 'Spotlight', price: '$19 / month', desc: 'Highlighted listing in search results' },
];

const STATUS_COLORS = {
  Active: { bg: '#E4F5EC', text: '#276048' },
  Paused: { bg: '#FFF8E4', text: '#7A5A10' },
  'Pending Review': { bg: '#EEE8FF', text: '#3D2E70' },
  Expired: { bg: '#EEF3F8', text: '#4A6580' },
  Draft: { bg: '#EEF3F8', text: '#4A6580' },
};

export default function SellerAds() {
  const [ads, setAds] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [listings, setListings] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_id: '', listing_id: '', headline: '', tagline: '',
    image_url: '', cta_text: 'Learn More', tier: 'Featured',
    start_date: '', end_date: '', budget: '',
  });

  const loadData = async () => {
    const [adsData, bizData, listData] = await Promise.all([
      base44.entities.Ad.list('-created_date', 100),
      base44.entities.Business.list('-created_date', 100),
      base44.entities.Listing.filter({ status: 'Active' }, '-created_date', 100),
    ]);
    setAds(adsData);
    setBusinesses(bizData);
    setListings(listData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await base44.entities.Ad.create({
      ...form,
      budget: form.budget ? parseFloat(form.budget) : 0,
      status: 'Pending Review',
      impressions: 0,
      clicks: 0,
    });
    setSaving(false);
    setShowCreate(false);
    setForm({ business_id: '', listing_id: '', headline: '', tagline: '', image_url: '', cta_text: 'Learn More', tier: 'Featured', start_date: '', end_date: '', budget: '' });
    loadData();
  };

  const toggleStatus = async (ad) => {
    const newStatus = ad.status === 'Active' ? 'Paused' : 'Active';
    await base44.entities.Ad.update(ad.id, { status: newStatus });
    loadData();
  };

  const deleteAd = async (id) => {
    await base44.entities.Ad.delete(id);
    loadData();
  };

  const getBiz = (id) => businesses.find(b => b.id === id);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3245', fontFamily: 'var(--font-fraunces)' }}>Ad Manager</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A6580' }}>Promote your services on the Community Hub</p>
        </div>
        <Button onClick={() => setShowCreate(true)} style={{ background: '#E8945A', color: '#fff' }}>
          <Plus className="w-4 h-4 mr-1" /> Create Ad
        </Button>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {TIERS.map(t => (
          <div key={t.value} className="rounded-xl p-4 border" style={{ background: '#EEF3F8', borderColor: 'rgba(30,50,69,0.10)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: '#E8945A' }} />
              <span className="font-semibold text-sm" style={{ color: '#1E3245' }}>{t.label}</span>
              <span className="ml-auto text-xs font-bold" style={{ color: '#E8945A' }}>{t.price}</span>
            </div>
            <p className="text-xs" style={{ color: '#4A6580' }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Ads list */}
      {loading ? (
        <div className="text-center py-16" style={{ color: '#4A6580' }}>Loading...</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: '#EEF3F8', color: '#4A6580' }}>
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ads yet</p>
          <p className="text-sm mt-1">Create your first ad to start reaching more customers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => {
            const biz = getBiz(ad.business_id);
            const sc = STATUS_COLORS[ad.status] || STATUS_COLORS.Draft;
            return (
              <div key={ad.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.10)' }}>
                {ad.image_url && <img src={ad.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: '#1E3245' }}>{ad.headline}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{ad.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EEE8FF', color: '#3D2E70' }}>{ad.tier}</span>
                  </div>
                  {biz && <p className="text-xs" style={{ color: '#4A6580' }}>{biz.name}</p>}
                  {ad.tagline && <p className="text-xs mt-0.5 truncate" style={{ color: '#4A6580' }}>{ad.tagline}</p>}
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0" style={{ color: '#4A6580' }}>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{ad.impressions || 0}</span>
                  <span className="flex items-center gap-1"><MousePointer className="w-3.5 h-3.5" />{ad.clicks || 0}</span>
                  <button onClick={() => toggleStatus(ad)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title={ad.status === 'Active' ? 'Pause' : 'Activate'}>
                    {ad.status === 'Active' ? <Pause className="w-4 h-4" style={{ color: '#D4A03A' }} /> : <Play className="w-4 h-4" style={{ color: '#5BAA7E' }} />}
                  </button>
                  <button onClick={() => deleteAd(ad.id)} className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-4 h-4" style={{ color: '#C06060' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Ad Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-fraunces)', color: '#1E3245' }}>Create New Ad</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Business</label>
              <Select value={form.business_id} onValueChange={v => setForm(f => ({ ...f, business_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Ad Tier</label>
              <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Headline *</label>
              <Input placeholder="e.g. Fast, Reliable HVAC Service" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Tagline</label>
              <Input placeholder="Short supporting text" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Image URL</label>
              <Input placeholder="https://..." value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>CTA Button Text</label>
                <Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Monthly Budget ($)</label>
                <Input type="number" placeholder="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>Start Date</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>End Date</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.headline || !form.business_id} style={{ background: '#E8945A', color: '#fff' }}>
                {saving ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}