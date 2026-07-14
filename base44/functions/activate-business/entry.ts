import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { business_id } = body;

    // Verify ownership
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    const business = businesses[0];
    if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });
    if (business_id && business.id !== business_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Check founding member eligibility
    const activeSellers = await base44.asServiceRole.entities.Business.filter({ onboarding_status: 'active' });
    const foundingCount = activeSellers.filter(b => b.is_founding_member).length;
    const isFoundingMember = foundingCount < 200;
    const TIER_PRICES = { starter: 0, pro: 29, business: 59, none: 0 };
    const lockedPrice = TIER_PRICES[business.trial_plan_tier] ?? 0;

    // Use service role to set is_founding_member / locked_subscription_price (locked fields)
    const updates = {
      onboarding_status: 'active',
      go_live_date: now,
      onboarding_completed_at: now,
      ...(isFoundingMember ? { is_founding_member: true, locked_subscription_price: lockedPrice } : {}),
    };

    await base44.asServiceRole.entities.Business.update(business.id, updates);

    return Response.json({
      ok: true,
      onboarding_status: 'active',
      go_live_date: now,
      onboarding_completed_at: now,
      is_founding_member: isFoundingMember,
      locked_subscription_price: isFoundingMember ? lockedPrice : undefined,
    });
  } catch (error) {
    console.error('Activate business error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});