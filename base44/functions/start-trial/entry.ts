import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { business_id, plan_tier } = body;

    if (!plan_tier) return Response.json({ error: 'plan_tier required' }, { status: 400 });

    // Verify ownership
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    const business = businesses[0];
    if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });
    if (business_id && business.id !== business_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Use service role to set subscription_status (locked field)
    await base44.asServiceRole.entities.Business.update(business.id, {
      trial_plan_tier: plan_tier,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      subscription_tier: plan_tier,
      subscription_status: 'trial',
    });

    return Response.json({
      ok: true,
      trial_plan_tier: plan_tier,
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      subscription_tier: plan_tier,
      subscription_status: 'trial',
    });
  } catch (error) {
    console.error('Start trial error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});