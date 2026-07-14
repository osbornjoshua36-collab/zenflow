import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

const CATEGORIES = ['Handmade & Crafts', 'Home Goods', 'Clothing & Accessories', 'Electronics', 'Collectibles', 'Other'];

export default function AiDraftFromPhoto({ imageUrl, businessId, sellerEmail, onApply }) {
  const [busy, setBusy] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const handleDraft = async () => {
    if (!imageUrl) return;
    setBusy(true);
    setExhausted(false);
    try {
      const creditRes = await base44.functions.invoke('consume-ai-image-credit', {
        business_id: businessId || null,
        seller_email: sellerEmail || null,
      });
      if (!creditRes.data?.allowed) {
        setExhausted(true);
        setBusy(false);
        return;
      }
      const draft = await base44.integrations.Core.InvokeLLM({
        prompt: "Look at this product photo and draft a marketplace listing. Return JSON with: title (max 80 chars, descriptive and appealing), description (2-3 sentences that sell the item), category (exactly one of: 'Handmade & Crafts', 'Home Goods', 'Clothing & Accessories', 'Electronics', 'Collectibles', 'Other').",
        file_urls: [imageUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
          required: ['title', 'description', 'category'],
        },
      });
      onApply({
        title: draft.title || '',
        description: draft.description || '',
        category: CATEGORIES.includes(draft.category) ? draft.category : '',
      });
    } catch (e) {
      console.error('AI draft failed:', e);
    }
    setBusy(false);
  };

  const handleBuyTopUp = async () => {
    try {
      const res = await base44.functions.invoke('create-checkout', {
        checkout_type: 'ai_credits',
        business_id: businessId || null,
        seller_email: sellerEmail || null,
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (e) {
      console.error('AI credits checkout failed:', e);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full gap-2" onClick={handleDraft} disabled={busy || !imageUrl}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {busy ? 'Drafting from photo…' : 'Draft listing from photo'}
      </Button>
      {!imageUrl && (
        <p className="text-xs text-muted-foreground">Upload a product photo first, then let AI draft the details.</p>
      )}
      {exhausted && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
          <p className="text-amber-800 font-medium">You've used all your free AI listings this month.</p>
          <p className="text-amber-700">Buy a 50-generation top-up pack for $5 — credits never expire.</p>
          <Button type="button" size="sm" onClick={handleBuyTopUp} style={{ background: '#E8945A', color: '#fff' }}>
            Buy 50 credits ($5)
          </Button>
        </div>
      )}
    </div>
  );
}