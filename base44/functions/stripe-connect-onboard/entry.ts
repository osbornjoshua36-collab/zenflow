import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Stripe REST helpers ──────────────────────────────────────────────────────
function formEncode(obj, prefix) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') parts.push(formEncode(item, `${key}[${i}]`));
        else if (item !== null && item !== undefined) parts.push(`${key}[${i}]=${encodeURIComponent(item)}`);
      });
    } else if (typeof v === 'object') {
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

async function stripeGet(path) {
  const res = await fetch('https://api.stripe.com/v1' + path, {
    headers: { 'Authorization': 'Bearer ' + Deno.env.get('STRIPE_SECRET_KEY') },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Stripe GET', path, JSON.stringify(data));
    throw new Error(data.error?.message || 'Stripe request failed');
  }
  return data;
}

function mapConnectStatus(acct) {
  if (acct.charges_enabled) return 'active';
  if (acct.details_submitted && !acct.charges_enabled) return 'restricted';
  return 'pending';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const origin = req.headers.get('origin') || 'https://sphere.base44.app';
    const return_url = `${origin}/seller/billing`;
    const refresh_url = `${origin}/seller/billing`;

    // Determine whether this user is a business seller or an individual seller.
    const businesses = await base44.entities.Business.filter({ owner_email: user.email });
    let business = businesses[0] || null;
    let profile = null;

    if (!business) {
      const profiles = await base44.entities.BuyerProfile.filter({ email: user.email });
      profile = profiles[0] || null;
      if (!profile) {
        profile = await base44.entities.BuyerProfile.create({
          user_id: user.id,
          display_name: user.full_name || user.email,
          email: user.email,
          stripe_connect_status: 'not_started',
        });
      }
    }

    let accountId = business?.stripe_connect_account_id || profile?.stripe_connect_account_id || null;
    const updateRecord = async (status) => {
      if (business) {
        await base44.asServiceRole.entities.Business.update(business.id, { stripe_connect_status: status, ...(accountId ? { stripe_connect_account_id: accountId } : {}) });
      } else if (profile) {
        await base44.entities.BuyerProfile.update(profile.id, { stripe_connect_status: status, ...(accountId ? { stripe_connect_account_id: accountId } : {}) });
      }
    };

    // Create a Connect Standard account if none exists yet.
    if (!accountId) {
      const acct = await stripePost('/accounts', {
        type: 'standard',
        country: 'US',
        email: user.email,
        'metadata[platform_user_id]': user.id,
        'metadata[seller_type]': business ? 'business' : 'individual',
        ...(business ? { 'metadata[business_id]': business.id } : {}),
      });
      accountId = acct.id;
      await updateRecord('pending');
    } else {
      // Refresh status from Stripe in case onboarding completed out-of-band.
      try {
        const acct = await stripeGet(`/accounts/${accountId}`);
        const status = mapConnectStatus(acct);
        await updateRecord(status);
        if (status === 'active') {
          return Response.json({ url: null, status: 'active' });
        }
      } catch (e) {
        console.error('Refresh connect status failed:', e.message);
      }
    }

    // Generate a hosted onboarding link.
    const link = await stripePost('/account_links', {
      account: accountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    });

    return Response.json({ url: link.url, status: 'pending' });
  } catch (error) {
    console.error('stripe-connect-onboard error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});