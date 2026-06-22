import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Save, Eye, Wand2, Plus, Trash2, GripVertical, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import BusinessPagePreview from '@/components/businesspage/BusinessPagePreview';
import TemplateSwitcher from '@/components/businesspage/TemplateSwitcher';

const TEMPLATE_DEFAULTS = {
  BOLD_CRAFT: { accent_color: '#e05c00', hero_cta_label: 'Get a Free Quote' },
  CLEAN_PRO:  { accent_color: '#0d2b45', hero_cta_label: 'Book a Consultation' },
  WARM_LOCAL: { accent_color: '#c0614a', hero_cta_label: 'Book Now' },
};

export default function BusinessPageEditor() {
  const [page, setPage] = useState(null);
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [showTemplateSwitch, setShowTemplateSwitch] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [handleError, setHandleError] = useState('');
  const autoSaveTimer = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => { isMounted.current = false; };
  }, []);

  const load = async () => {
    const me = await base44.auth.me();
    const [bizList, reviewsList] = await Promise.all([
      base44.entities.Business.filter({ owner_email: me.email }),
      base44.entities.Review.list('-created_date', 20),
    ]);
    const biz = bizList[0];
    if (!biz) { setLoading(false); return; }
    setBusiness(biz);
    setReviews(reviewsList.filter(r => r.business_id === biz.id && r.verified));

    const pages = await base44.entities.BusinessPage.filter({ business_id: biz.id });
    if (pages[0]) {
      setPage(pages[0]);
    } else {
      // Create a blank draft page
      const newPage = await base44.entities.BusinessPage.create({
        business_id: biz.id,
        mode: 'hosted',
        status: 'draft',
        template: 'BOLD_CRAFT',
        accent_color: '#e05c00',
        hero_headline: `${biz.business_name || biz.name} — Professional ${biz.industry || 'Services'}`,
        hero_subheadline: `Serving ${biz.business_city || 'your area'} and surrounding areas`,
        hero_cta_label: 'Get a Free Quote',
        contact_area_text: `${biz.business_city || 'Your City'} and surrounding areas`,
        contact_email: biz.owner_email,
        contact_phone: biz.owner_phone || biz.business_phone,
        services: [],
        gallery_images: [],
        trust_stats: [
          { label: 'Licensed & Insured', value: '✓' },
          { label: '5★ Average', value: '⭐' },
        ],
        handle: (biz.business_name || biz.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
      setPage(newPage);
    }
    setLoading(false);
  };

  const update = useCallback((changes) => {
    setPage(prev => ({ ...prev, ...changes }));
    setSaveStatus('saving');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(changes), 2000);
  }, []);

  const save = async (extra = {}) => {
    if (!page) return;
    setSaveStatus('saving');
    const updated = { ...page, ...extra, last_saved_at: new Date().toISOString() };
    await base44.entities.BusinessPage.update(page.id, updated);
    if (isMounted.current) setSaveStatus('saved');
  };

  const handlePublish = async () => {
    if (!page) return;
    setPublishLoading(true);
    // Check handle uniqueness
    const existing = await base44.entities.BusinessPage.filter({ handle: page.handle });
    const conflict = existing.find(p => p.id !== page.id);
    if (conflict) {
      setHandleError('This URL handle is already taken. Please choose a different one.');
      setPublishLoading(false);
      return;
    }
    await base44.entities.BusinessPage.update(page.id, { status: 'published', last_saved_at: new Date().toISOString() });
    setPage(prev => ({ ...prev, status: 'published' }));
    setPublishLoading(false);
  };

  const handleUnpublish = async () => {
    await base44.entities.BusinessPage.update(page.id, { status: 'draft' });
    setPage(prev => ({ ...prev, status: 'draft' }));
  };

  const handleGenerateAI = async () => {
    if (!business) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate professional website content for a ${business.industry || 'service'} business.
Business name: ${business.business_name || business.name}
Category: ${business.industry || 'General Services'}
City: ${business.business_city || 'Your City'}, ${business.business_state || ''}
Owner first name: ${business.owner_first_name || ''}

Return a JSON object with these fields:
- hero_headline: benefit-led headline (1 sentence, not generic)
- hero_subheadline: location-specific subheadline (1 sentence)
- hero_cta_label: CTA button text (e.g. "Get a Free Quote" for trades, "Book Now" for personal services)
- about_text: 2-3 sentences in first-person voice, warm and personal
- services: array of 4 objects each with {name, description, emoji, price: ""}
- trust_stats: array of 3 objects with {label, value} — e.g. {label: "Jobs Completed", value: "200+"}
- contact_area_text: e.g. "${business.business_city} and surrounding areas"
- seo_title: keyword-appropriate title
- seo_description: 1-2 sentence meta description`,
      response_json_schema: {
        type: 'object',
        properties: {
          hero_headline: { type: 'string' },
          hero_subheadline: { type: 'string' },
          hero_cta_label: { type: 'string' },
          about_text: { type: 'string' },
          services: { type: 'array', items: { type: 'object' } },
          trust_stats: { type: 'array', items: { type: 'object' } },
          contact_area_text: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
        },
      },
    });
    const updates = {
      ...result,
      ai_generated: true,
      ai_draft_status: 'draft',
    };
    setPage(prev => ({ ...prev, ...updates }));
    await base44.entities.BusinessPage.update(page.id, { ...updates, last_saved_at: new Date().toISOString() });
    setSaveStatus('saved');
    setGenerating(false);
  };

  const handleTemplateSwitch = async (newTemplate) => {
    const defaults = TEMPLATE_DEFAULTS[newTemplate] || {};
    const updates = { template: newTemplate, accent_color: defaults.accent_color, hero_cta_label: defaults.hero_cta_label };
    setPage(prev => ({ ...prev, ...updates }));
    await base44.entities.BusinessPage.update(page.id, { ...updates, last_saved_at: new Date().toISOString() });
    setSaveStatus('saved');
    setShowTemplateSwitch(false);
  };

  // Service CRUD helpers
  const addService = () => {
    const services = [...(page.services || []), { id: Date.now().toString(), name: 'New Service', description: 'Describe what this service includes.', emoji: '🔧', price: '' }];
    update({ services });
  };
  const updateService = (id, changes) => {
    const services = (page.services || []).map(s => s.id === id ? { ...s, ...changes } : s);
    update({ services });
  };
  const deleteService = (id) => {
    const services = (page.services || []).filter(s => s.id !== id);
    update({ services });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!business) return <div className="text-slate-500 text-center py-12">No business account found.</div>;

  const publicUrl = `/p/${page?.handle}`;

  return (
    <div className="space-y-0 -m-8">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-800">My Sphere Page</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${page?.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {page?.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : '⚠ Error'}
          </span>
          {page?.status === 'published' && (
            <Link to={publicUrl} target="_blank" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> View Live
            </Link>
          )}
          {page?.status === 'published' ? (
            <Button size="sm" variant="outline" onClick={handleUnpublish}>Unpublish</Button>
          ) : (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handlePublish} disabled={publishLoading}>
              {publishLoading ? 'Publishing…' : 'Publish Page'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-130px)]">
        {/* Left panel — editor controls */}
        <div className="w-96 flex-shrink-0 overflow-y-auto border-r bg-slate-50 p-5 space-y-6">

          {/* AI Generate */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">✨ AI Page Generator</p>
            <p className="text-xs text-amber-700 mb-3">Let AI write your hero, about section, and services based on your business profile.</p>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 gap-2 w-full" onClick={handleGenerateAI} disabled={generating}>
              <Wand2 className="w-4 h-4" />
              {generating ? 'Generating…' : 'Generate with AI'}
            </Button>
          </div>

          {/* Template */}
          <Section title="Template">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 font-medium">{page?.template?.replace('_', ' ')}</span>
              <Button size="sm" variant="outline" onClick={() => setShowTemplateSwitch(true)}>Change</Button>
            </div>
            <div className="mt-3">
              <label className="text-xs text-slate-500 block mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={page?.accent_color || '#e05c00'} onChange={e => update({ accent_color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-slate-200" />
                <Input value={page?.accent_color || ''} onChange={e => update({ accent_color: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          </Section>

          {/* URL Handle */}
          <Section title="Page URL">
            <label className="text-xs text-slate-500 block mb-1">sphere.com/p/<span className="font-semibold text-slate-700">{page?.handle}</span></label>
            <Input
              value={page?.handle || ''}
              onChange={e => { setHandleError(''); update({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }); }}
              placeholder="your-business-name"
              className="text-sm"
            />
            {handleError && <p className="text-xs text-red-500 mt-1">{handleError}</p>}
          </Section>

          {/* Hero */}
          <Section title="Hero Section">
            <FieldGroup label="Headline">
              <Input value={page?.hero_headline || ''} onChange={e => update({ hero_headline: e.target.value })} placeholder="Your powerful headline" />
            </FieldGroup>
            <FieldGroup label="Subheadline">
              <Input value={page?.hero_subheadline || ''} onChange={e => update({ hero_subheadline: e.target.value })} placeholder="Location-specific subheadline" />
            </FieldGroup>
            <FieldGroup label="CTA Button">
              <Input value={page?.hero_cta_label || ''} onChange={e => update({ hero_cta_label: e.target.value })} placeholder="Get a Free Quote" />
            </FieldGroup>
            <FieldGroup label="Hero Image URL">
              <Input value={page?.hero_image_url || ''} onChange={e => update({ hero_image_url: e.target.value })} placeholder="https://..." />
            </FieldGroup>
          </Section>

          {/* Trust Stats */}
          <Section title="Trust Bar">
            {(page?.trust_stats || []).map((stat, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={stat.value} onChange={e => { const ts = [...(page.trust_stats||[])]; ts[i] = { ...ts[i], value: e.target.value }; update({ trust_stats: ts }); }} placeholder="200+" className="w-20 text-xs" />
                <Input value={stat.label} onChange={e => { const ts = [...(page.trust_stats||[])]; ts[i] = { ...ts[i], label: e.target.value }; update({ trust_stats: ts }); }} placeholder="Jobs Done" className="text-xs flex-1" />
                <button onClick={() => { const ts = (page.trust_stats||[]).filter((_, j) => j !== i); update({ trust_stats: ts }); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => update({ trust_stats: [...(page.trust_stats || []), { value: '', label: '' }] })} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
              <Plus className="w-3 h-3" /> Add stat
            </button>
          </Section>

          {/* Services */}
          <Section title="Services">
            {(page?.services || []).map(s => (
              <div key={s.id} className="bg-white border rounded-lg p-3 mb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={s.emoji || ''} onChange={e => updateService(s.id, { emoji: e.target.value })} className="w-12 text-center text-lg" />
                  <Input value={s.name} onChange={e => updateService(s.id, { name: e.target.value })} placeholder="Service name" className="flex-1 text-sm" />
                  <button onClick={() => deleteService(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Input value={s.description} onChange={e => updateService(s.id, { description: e.target.value })} placeholder="Short description" className="text-xs" />
                <Input value={s.price || ''} onChange={e => updateService(s.id, { price: e.target.value })} placeholder="Price (optional)" className="text-xs" />
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full gap-1 mt-1" onClick={addService}>
              <Plus className="w-3.5 h-3.5" /> Add Service
            </Button>
          </Section>

          {/* About */}
          <Section title="About">
            <FieldGroup label="Your Story">
              <textarea
                value={page?.about_text || ''}
                onChange={e => update({ about_text: e.target.value })}
                placeholder={`Hi, I'm ${business?.owner_first_name || 'the owner'}. Tell customers about yourself…`}
                rows={4}
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </FieldGroup>
            <FieldGroup label="Photo URL">
              <Input value={page?.about_image_url || ''} onChange={e => update({ about_image_url: e.target.value })} placeholder="https://..." />
            </FieldGroup>
          </Section>

          {/* Gallery */}
          <Section title="Gallery Photos">
            <p className="text-xs text-slate-500 mb-2">Add image URLs (max 8)</p>
            {(page?.gallery_images || []).map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={url} onChange={e => { const imgs = [...(page.gallery_images||[])]; imgs[i] = e.target.value; update({ gallery_images: imgs }); }} placeholder="https://..." className="text-xs flex-1" />
                <button onClick={() => { const imgs = (page.gallery_images||[]).filter((_, j) => j !== i); update({ gallery_images: imgs }); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {(page?.gallery_images || []).length < 8 && (
              <button onClick={() => update({ gallery_images: [...(page.gallery_images || []), ''] })} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add photo
              </button>
            )}
          </Section>

          {/* Contact */}
          <Section title="Contact Info">
            <FieldGroup label="Service Area">
              <Input value={page?.contact_area_text || ''} onChange={e => update({ contact_area_text: e.target.value })} placeholder="City and surrounding areas" />
            </FieldGroup>
            <FieldGroup label="Email">
              <Input value={page?.contact_email || ''} onChange={e => update({ contact_email: e.target.value })} placeholder="your@email.com" />
            </FieldGroup>
            <FieldGroup label="Phone">
              <Input value={page?.contact_phone || ''} onChange={e => update({ contact_phone: e.target.value })} placeholder="(555) 000-0000" />
            </FieldGroup>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <FieldGroup label={`Title (${(page?.seo_title || '').length}/60)`}>
              <Input value={page?.seo_title || ''} onChange={e => update({ seo_title: e.target.value })} maxLength={60} />
            </FieldGroup>
            <FieldGroup label={`Description (${(page?.seo_description || '').length}/160)`}>
              <textarea value={page?.seo_description || ''} onChange={e => update({ seo_description: e.target.value })} maxLength={160} rows={3}
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </FieldGroup>
          </Section>

          <div className="h-8" />
        </div>

        {/* Right panel — live preview */}
        <div className="flex-1 overflow-y-auto bg-slate-200">
          <div className="min-h-full">
            <BusinessPagePreview page={page} business={business} reviews={reviews} isPreview />
          </div>
        </div>
      </div>

      {showTemplateSwitch && (
        <TemplateSwitcher
          current={page?.template}
          onConfirm={handleTemplateSwitch}
          onCancel={() => setShowTemplateSwitch(false)}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="mb-3">
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}