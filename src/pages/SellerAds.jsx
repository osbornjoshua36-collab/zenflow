import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, MousePointer, Zap, Pause, Play, Trash2, CreditCard } from 'lucide-react';

const TIERS = [
  {
    value: 'Banner',
    label: 'Banner',
    price: '$49 / month',
    accentColor: '#E8945A',
    accentBg: '#FFF3EA',
    badge: 'Most Visible',
    desc: 'Prime real estate — your ad loads as a full-width strip at the very top of Community Hub, before any listings appear.',
    reach: [
      'Seen by 100% of Community Hub visitors',
      'Appears before any listings load',
      'Includes image, headline & CTA button',
      'Avg. 3–5× more clicks than organic listings',
    ],
  },
  {
    value: 'Featured',
    label: 'Featured',
    price: '$29 / month',
    accentColor: '#7A6AAA',
    accentBg: '#EEE8FF',
    badge: 'Best Value',
    desc: 'Your service card is pinned at the top of the Browse grid with a Featured badge — visible above all organic results.',
    reach: [
      'Pinned above all organic listings',
      'Branded card with image & description',
      'Visible across all category filter views',
      'Avg. 2× more inquiries than standard',
    ],
  },
  {
    value: 'Spotlight',
    label: 'Spotlight',
    price: '$19 / month',
    accentColor: '#D4A03A',
    accentBg: '#FFF8E4',
    badge: 'Entry Tier',
    desc: 'A compact highlighted strip displayed just below the hub hero — great for brand awareness on a budget.',
    reach: [
      'Compact headline + tagline strip',
      'Shown below the hero section',
      'Budget-friendly brand awareness',
      'Ideal for new businesses building presence',
    ],
  },
];

const STATUS_COLORS = {
  Active: { bg: '#E4F5EC', text: '#276048' },
  Paused: { bg: '#FFF8E4', text: '#7A5A10' },
  'Pending Review': { bg: '#EEE8FF', text: '#3D2E70' },
  'Pending Payment': { bg: '#FFF3EA', text: '#A05028' },
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
    
    // Create the ad record first
    const newAd = await base44.entities.Ad.create({
      ...form,
      budget: form.budget ? parseFloat(form.budget) : 0,
      status: 'Pending Payment',
      impressions: 0,
      clicks: 0,
    });
    
    // Then initiate payment
    try {
      const res = await base44.functions.invoke('create-checkout', {
        tier: form.tier,
        business_id: form.business_id,
        headline: form.headline,
        ad_id: newAd.id,
      });
      
      if (res.data?.redirectUrl) {
        // Redirect to Wix Payments checkout
        window.location.href = res.data.redirectUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setSaving(false);
      alert('Failed to initiate payment. Please try again.');
      // Clean up: delete the ad if payment fails
      await base44.entities.Ad.delete(newAd.id);
      loadData();
    }
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
      <p className="text-sm font-semibold mb-3" style={{ color: '#8DAFC8' }}>Choose an ad tier that fits your goals</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {TIERS.map(t => (
          <div key={t.value} className="rounded-2xl overflow-hidden flex flex-col" style={{ border: `1.5px solid ${t.accentColor}55`, boxShadow: '0 2px 14px rgba(30,50,69,0.07)' }}>

            {/* Header */}
            <div className="px-5 pt-5 pb-4" style={{ background: t.accentBg }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: t.accentColor, color: '#fff' }}>{t.badge}</span>
                <span className="text-sm font-bold" style={{ color: t.accentColor }}>{t.price}</span>
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)', color: '#1E3245' }}>{t.label} Ad</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#4A6580' }}>{t.desc}</p>
            </div>

            {/* Community Hub preview mockup */}
            <div className="px-4 py-3 border-t" style={{ borderColor: `${t.accentColor}33`, background: '#F0F4F8' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8DAFC8' }}>How it looks on Community Hub</p>
              <div className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${t.accentColor}88`, background: '#fff' }}>
                {/* Fake hub topbar */}
                <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ background: '#1E3245' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  <div className="h-1 rounded bg-white/20 w-20" />
                  <div className="ml-auto h-1 rounded bg-white/20 w-8" />
                </div>

                {t.value === 'Banner' && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'linear-gradient(90deg, #2E4A65, #1E3245)' }}>
                      <div className="w-9 h-9 rounded-md flex-shrink-0" style={{ background: t.accentColor + '60' }} />
                      <div className="flex-1">
                        <div className="h-2 rounded mb-1 w-3/4" style={{ background: 'rgba(255,255,255,0.85)' }} />
                        <div className="h-1.5 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <div className="text-xs font-bold px-2.5 py-1 rounded-md flex-shrink-0" style={{ background: t.accentColor, color: '#fff' }}>Book Now</div>
                    </div>
                    <div className="px-3 py-1 flex items-center gap-1" style={{ background: t.accentBg }}>
                      <Zap className="w-3 h-3" style={{ color: t.accentColor }} />
                      <span className="text-xs font-medium" style={{ color: t.accentColor }}>Sponsored · Top of page</span>
                    </div>
                    <div className="px-3 py-1.5 grid grid-cols-3 gap-1.5">
                      {[1,2,3].map(i => <div key={i} className="h-5 rounded" style={{ background: '#EEF3F8' }} />)}
                    </div>
                  </div>
                )}

                {t.value === 'Featured' && (
                  <div className="px-3 py-2">
                    <div className="h-1.5 rounded bg-slate-100 w-24 mb-2" />
                    <div className="rounded-lg p-2 mb-1.5" style={{ border: `1.5px solid ${t.accentColor}`, background: t.accentBg }}>
                      <div className="flex gap-2 items-start">
                        <div className="w-10 h-10 rounded flex-shrink-0" style={{ background: t.accentColor + '50' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="h-2 rounded w-16" style={{ background: t.accentColor + 'AA' }} />
                            <span className="text-xs px-1 rounded font-bold" style={{ background: t.accentColor, color: '#fff', fontSize: 8 }}>Featured</span>
                          </div>
                          <div className="h-1.5 rounded bg-slate-200 w-full mb-1" />
                          <div className="h-1.5 rounded bg-slate-100 w-2/3" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[1,2].map(i => <div key={i} className="h-8 rounded" style={{ background: '#EEF3F8' }} />)}
                    </div>
                  </div>
                )}

                {t.value === 'Spotlight' && (
                  <div>
                    <div className="px-3 py-2">
                      <div className="h-4 rounded mb-1.5 w-3/4" style={{ background: '#EEF3F8' }} />
                      <div className="h-3 rounded w-1/2" style={{ background: '#EEF3F8' }} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-2 rounded-lg" style={{ background: t.accentBg, border: `1px solid ${t.accentColor}66` }}>
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.accentColor }} />
                      <div className="flex-1">
                        <div className="h-2 rounded w-2/3 mb-1" style={{ background: t.accentColor + '80' }} />
                        <div className="h-1.5 rounded w-1/2 bg-slate-200" />
                      </div>
                      <div className="text-xs font-bold" style={{ color: t.accentColor }}>→</div>
                    </div>
                    <div className="px-3 pb-2 grid grid-cols-3 gap-1">
                      {[1,2,3].map(i => <div key={i} className="h-4 rounded" style={{ background: '#EEF3F8' }} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audience reach */}
            <div className="px-5 py-4 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8DAFC8' }}>Audience reach</p>
              <ul className="space-y-1.5">
                {t.reach.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#2E4A65' }}>
                    <span className="font-bold mt-0.5" style={{ color: t.accentColor }}>✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => { setForm(f => ({ ...f, tier: t.value })); setShowCreate(true); }}
                className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: t.accentColor, color: '#fff' }}
              >
                Create {t.label} Ad
              </button>
            </div>
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
              <Button onClick={handleCreate} disabled={saving || !form.headline || !form.business_id} style={{ background: '#E8945A', color: '#fff' }} className="gap-2">
                {saving ? 'Processing...' : <><CreditCard className="w-4 h-4" /> Proceed to Payment</> }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}