import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Free monthly image-generation allotments by tier (fallbacks if PlatformConfig missing).
const ALLOTMENT_DEFAULTS = {
  individual: 3,
  starter: 5,
  pro: 30,
  business: 75,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { business_id, seller_email } = body;

    if (!business_id && !seller_email) {
      return Response.json({ error: 'Missing business_id or seller_email' }, { status: 400 });
    }

    // Resolve the monthly free allotment for this seller's tier.
    let allotment = ALLOTMENT_DEFAULTS.individual;
    if (business_id) {
      const businesses = await base44.asServiceRole.entities.Business.filter({ id: business_id });
      const biz = businesses[0];
      const plan = biz ? (biz.subscription_plan || 'starter').toLowerCase() : 'starter';
      const cfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: `ai_credits_allotment_${plan}` });
      if (cfg.length > 0) {
        allotment = parseInt(cfg[0].value) || ALLOTMENT_DEFAULTS[plan] || ALLOTMENT_DEFAULTS.starter;
      } else {
        allotment = ALLOTMENT_DEFAULTS[plan] || ALLOTMENT_DEFAULTS.starter;
      }
    } else {
      const cfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'ai_credits_allotment_individual' });
      if (cfg.length > 0) allotment = parseInt(cfg[0].value) || ALLOTMENT_DEFAULTS.individual;
    }

    // Find or create the credit record for this seller.
    const filter = business_id ? { business_id } : { seller_email };
    let records = await base44.asServiceRole.entities.AiImageCredit.filter(filter);
    let record = records[0];

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const currentMonth = todayStr.slice(0, 7); // YYYY-MM

    if (!record) {
      record = await base44.asServiceRole.entities.AiImageCredit.create({
        ...(business_id ? { business_id } : {}),
        ...(seller_email ? { seller_email } : {}),
        monthly_generations_used: 0,
        current_period_start: todayStr,
        purchased_credits_balance: 0,
      });
    } else {
      // Lazy monthly reset — happens automatically when the seller next generates,
      // no cron or seller action required.
      const periodMonth = (record.current_period_start || '').slice(0, 7);
      if (periodMonth !== currentMonth) {
        await base44.asServiceRole.entities.AiImageCredit.update(record.id, {
          monthly_generations_used: 0,
          current_period_start: todayStr,
        });
        record.monthly_generations_used = 0;
        record.current_period_start = todayStr;
      }
    }

    const used = record.monthly_generations_used || 0;
    const purchased = record.purchased_credits_balance || 0;

    // 1) Free monthly allotment first.
    if (used < allotment) {
      await base44.asServiceRole.entities.AiImageCredit.update(record.id, {
        monthly_generations_used: used + 1,
      });
      return Response.json({
        allowed: true,
        source: 'monthly',
        remaining_monthly: allotment - used - 1,
        remaining_purchased: purchased,
        allotment,
        monthly_used: used + 1,
      });
    }

    // 2) Purchased credits once the allotment is exhausted.
    if (purchased > 0) {
      await base44.asServiceRole.entities.AiImageCredit.update(record.id, {
        purchased_credits_balance: purchased - 1,
      });
      return Response.json({
        allowed: true,
        source: 'purchased',
        remaining_monthly: 0,
        remaining_purchased: purchased - 1,
        allotment,
        monthly_used: used,
      });
    }

    // 3) Both exhausted — caller should offer a top-up.
    return Response.json({
      allowed: false,
      reason: 'exhausted',
      remaining_monthly: 0,
      remaining_purchased: 0,
      allotment,
      monthly_used: used,
    });
  } catch (error) {
    console.error('consume-ai-image-credit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});