import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

function formEncode(obj, prefix) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      parts.push(formEncode(v, key));
    } else {
      parts.push(`${key}=${encodeURIComponent(v)}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

async function stripePost(path, params) {
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + Deno.env.get('STRIPE_SECRET_KEY'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formEncode(params),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Stripe POST', path, JSON.stringify(data));
    throw new Error(data.error?.message || 'Stripe request failed');
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { business_id } = body;

    // Verify ownership.
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    const business = businesses[0];
    if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });
    if (business_id && business.id !== business_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const subscriptionId = business.base44_subscription_id;

    // Cancel at period end so the seller keeps access through the paid cycle.
    if (subscriptionId) {
      try {
        await stripePost(`/subscriptions/${subscriptionId}`, { cancel_at_period_end: true });
      } catch (e) {
        console.error('Stripe cancel failed:', e.message);
        return Response.json({ error: 'Failed to cancel subscription with Stripe' }, { status: 500 });
      }
    }

    // Mirror the previous behaviour: mark cancelled + revert plan to starter.
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