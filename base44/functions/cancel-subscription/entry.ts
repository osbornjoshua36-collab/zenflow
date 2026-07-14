import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { business_id } = body;

    // Find the user's business and verify ownership
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    const business = businesses[0];
    if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });
    if (business_id && business.id !== business_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const subscriptionId = business.base44_subscription_id;

    // Cancel with the payment processor first (if a subscription exists)
    if (subscriptionId) {
      let cancelled = false;
      // Try soft cancel first (keeps access until end of billing cycle)
      const softResponse = await fetch(
        `https://www.wixapis.com/payments/base44/v1/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
            'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
          },
          body: JSON.stringify({
            subscription_id: subscriptionId,
            reason: 'User requested cancellation',
            immediate: false,
          }),
        }
      );

      if (softResponse.ok) {
        cancelled = true;
      } else {
        const errText = await softResponse.text();
        console.error('Soft cancel failed, trying immediate:', errText);
        // Fall back to immediate cancellation
        const immediateResponse = await fetch(
          `https://www.wixapis.com/payments/base44/v1/subscriptions/${subscriptionId}/cancel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
              'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
            },
            body: JSON.stringify({
              subscription_id: subscriptionId,
              reason: 'User requested cancellation',
              immediate: true,
            }),
          }
        );
        if (immediateResponse.ok) {
          cancelled = true;
        } else {
          const errText2 = await immediateResponse.text();
          console.error('Immediate cancel also failed:', errText2);
          return Response.json({ error: 'Failed to cancel subscription with payment processor' }, { status: 500 });
        }
      }
    }

    // Only update the Business record after the processor cancellation succeeds
    // (or if there was no subscription to cancel — e.g. trial-only)
    await base44.asServiceRole.entities.Business.update(business.id, {
      subscription_status: 'cancelled',
      subscription_plan: 'starter',
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Cancel subscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});