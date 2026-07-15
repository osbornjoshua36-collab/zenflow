import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Stripe REST helpers (raw fetch, no SDK dependency) ────────────────────────
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

// Resolve a seller's Stripe Connect account + onboarding status.
async function getConnectAccount(base44, { businessId, sellerEmail }) {
  if (businessId) {
    const bs = await base44.asServiceRole.entities.Business.filter({ id: businessId });
    const b = bs[0];
    if (b) return { accountId: b.stripe_connect_account_id, status: b.stripe_connect_status };
  }
  if (sellerEmail) {
    const ps = await base44.asServiceRole.entities.BuyerProfile.filter({ email: sellerEmail });
    const p = ps[0];
    if (p) return { accountId: p.stripe_connect_account_id, status: p.stripe_connect_status };
  }
  return { accountId: null, status: 'not_started' };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { checkout_type } = body;
    const origin = req.headers.get('origin') || 'https://sphere.base44.app';
    const base44 = createClientFromRequest(req);

    // ── Job payment (Connect) ─────────────────────────────────────────────────
    if (checkout_type === 'job_payment') {
      const { job_id, invoice_id, amount, seller_business_id } = body;
      if (!job_id || !invoice_id || !amount) {
        return Response.json({ error: 'Missing job_id, invoice_id or amount' }, { status: 400 });
      }
      if (parseFloat(amount) < 0.50) {
        return Response.json({ error: 'Amount must be at least $0.50' }, { status: 400 });
      }
      const acct = await getConnectAccount(base44, { businessId: seller_business_id });
      if (acct.status !== 'active' || !acct.accountId) {
        return Response.json({
          error: 'payout_setup_required',
          message: 'The seller has not finished payout setup and cannot receive payments yet.',
        }, { status: 403 });
      }
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': Math.round(parseFloat(amount) * 100),
        'line_items[0][price_data][product_data][name]': `Job Payment #${job_id}`,
        'line_items[0][quantity]': 1,
        'payment_intent_data[metadata][checkout_type]': 'job_payment',
        'payment_intent_data[metadata][job_id]': job_id,
        'payment_intent_data[metadata][invoice_id]': invoice_id,
        'payment_intent_data[metadata][seller_business_id]': seller_business_id || '',
        'payment_intent_data[metadata][gross_amount]': parseFloat(amount).toFixed(2),
        'metadata[checkout_type]': 'job_payment',
        'metadata[job_id]': job_id,
        'metadata[invoice_id]': invoice_id,
        'metadata[seller_business_id]': seller_business_id || '',
        success_url: `${origin}/payment-success?plan_type=job&job_id=${job_id}`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    // ── Product order (Connect) ──────────────────────────────────────────────
    if (checkout_type === 'order_payment') {
      const { order_id, product_id, amount } = body;
      if (!order_id || !product_id || !amount) {
        return Response.json({ error: 'Missing order_id, product_id or amount' }, { status: 400 });
      }
      if (parseFloat(amount) < 0.50) {
        return Response.json({ error: 'Amount must be at least $0.50' }, { status: 400 });
      }
      const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
      const product = products[0];
      const sellerBusinessId = product?.business_id || null;
      const sellerEmail = product?.seller_email || null;
      const acct = await getConnectAccount(base44, { businessId: sellerBusinessId, sellerEmail });
      if (acct.status !== 'active' || !acct.accountId) {
        return Response.json({
          error: 'payout_setup_required',
          message: 'This seller has not finished payout setup and cannot receive payments yet.',
        }, { status: 403 });
      }
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': Math.round(parseFloat(amount) * 100),
        'line_items[0][price_data][product_data][name]': (product?.title || 'Product Order').slice(0, 200),
        'line_items[0][quantity]': 1,
        'payment_intent_data[metadata][checkout_type]': 'order_payment',
        'payment_intent_data[metadata][order_id]': order_id,
        'payment_intent_data[metadata][product_id]': product_id,
        'payment_intent_data[metadata][seller_business_id]': sellerBusinessId || '',
        'payment_intent_data[metadata][seller_email]': sellerEmail || '',
        'metadata[checkout_type]': 'order_payment',
        'metadata[order_id]': order_id,
        'metadata[product_id]': product_id,
        'metadata[seller_business_id]': sellerBusinessId || '',
        'metadata[seller_email]': sellerEmail || '',
        success_url: `${origin}/payment-success?plan_type=order&order_id=${order_id}`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    // ── Listing boost (Connect) ───────────────────────────────────────────────
    if (checkout_type === 'boost') {
      const { listing_id, boost_tier } = body;
      if (!listing_id || !boost_tier) {
        return Response.json({ error: 'Missing listing_id or boost_tier' }, { status: 400 });
      }
      const listings = await base44.asServiceRole.entities.Listing.filter({ id: listing_id });
      const listing = listings[0];
      const sellerBusinessId = listing?.business_id || null;
      const acct = await getConnectAccount(base44, { businessId: sellerBusinessId });
      if (acct.status !== 'active' || !acct.accountId) {
        return Response.json({
          error: 'payout_setup_required',
          message: 'You must finish payout setup before boosting a listing.',
        }, { status: 403 });
      }
      const unitAmount = boost_tier === '7day' ? 1500 : 3900;
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': unitAmount,
        'line_items[0][price_data][product_data][name]': `Listing Boost (${boost_tier})`,
        'line_items[0][quantity]': 1,
        'payment_intent_data[metadata][checkout_type]': 'boost',
        'payment_intent_data[metadata][listing_id]': listing_id,
        'payment_intent_data[metadata][boost_tier]': boost_tier,
        'payment_intent_data[metadata][seller_business_id]': sellerBusinessId || '',
        'metadata[checkout_type]': 'boost',
        'metadata[listing_id]': listing_id,
        'metadata[boost_tier]': boost_tier,
        'metadata[seller_business_id]': sellerBusinessId || '',
        success_url: `${origin}/payment-success?plan_type=boost`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    // ── AI image credits top-up (platform account, no Connect split) ─────────
    if (checkout_type === 'ai_credits') {
      const { business_id, seller_email } = body;
      if (!business_id && !seller_email) {
        return Response.json({ error: 'Missing business_id or seller_email' }, { status: 400 });
      }
      const priceCfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'ai_credits_pack_price' });
      const sizeCfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'ai_credits_pack_size' });
      const price = priceCfg.length > 0 ? parseFloat(priceCfg[0].value) : 5;
      const packSize = sizeCfg.length > 0 ? parseInt(sizeCfg[0].value) : 50;
      if (price < 0.50) {
        return Response.json({ error: 'Amount must be at least $0.50' }, { status: 400 });
      }
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': Math.round(price * 100),
        'line_items[0][price_data][product_data][name]': `${packSize} AI Listing Credits`,
        'line_items[0][quantity]': 1,
        'payment_intent_data[metadata][checkout_type]': 'ai_credits',
        'payment_intent_data[metadata][business_id]': business_id || '',
        'payment_intent_data[metadata][seller_email]': seller_email || '',
        'payment_intent_data[metadata][pack_size]': String(packSize),
        'metadata[checkout_type]': 'ai_credits',
        'metadata[business_id]': business_id || '',
        'metadata[seller_email]': seller_email || '',
        'metadata[pack_size]': String(packSize),
        success_url: `${origin}/payment-success?plan_type=ai_credits`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    // ── SaaS subscription (platform account) ─────────────────────────────────
    if (checkout_type === 'subscription') {
      const { subscription_plan_id, business_id } = body;
      const PLANS = {
        pro_monthly: { name: 'Pro Plan Monthly', amount: 4900, plan: 'pro' },
        business_monthly: { name: 'Business Plan Monthly', amount: 9900, plan: 'business' },
      };
      const plan = PLANS[subscription_plan_id];
      if (!plan) {
        return Response.json({ error: 'Invalid subscription plan ID' }, { status: 400 });
      }
      const session = await stripePost('/checkout/sessions', {
        mode: 'subscription',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': plan.amount,
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][product_data][name]': plan.name,
        'line_items[0][quantity]': 1,
        'subscription_data[metadata][checkout_type]': 'subscription',
        'subscription_data[metadata][business_id]': business_id || '',
        'subscription_data[metadata][plan]': plan.plan,
        'metadata[checkout_type]': 'subscription',
        'metadata[business_id]': business_id || '',
        'metadata[plan]': plan.plan,
        success_url: `${origin}/payment-success?plan_type=subscription`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    // ── Ad placement subscription (platform account) ──────────────────────────
    if (checkout_type === 'ad') {
      const { tier, business_id, ad_id, headline } = body;
      const PRICING = { Banner: 4999, Featured: 2999, Spotlight: 1999 };
      if (!PRICING[tier]) {
        return Response.json({ error: 'Invalid tier' }, { status: 400 });
      }
      const session = await stripePost('/checkout/sessions', {
        mode: 'subscription',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': PRICING[tier],
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][product_data][name]': `${tier} Ad — ${headline || 'Service Promotion'}`.slice(0, 200),
        'line_items[0][quantity]': 1,
        'subscription_data[metadata][checkout_type]': 'ad',
        'subscription_data[metadata][ad_id]': ad_id || '',
        'subscription_data[metadata][business_id]': business_id || '',
        'subscription_data[metadata][tier]': tier,
        'metadata[checkout_type]': 'ad',
        'metadata[ad_id]': ad_id || '',
        'metadata[business_id]': business_id || '',
        'metadata[tier]': tier,
        success_url: `${origin}/payment-success?plan_type=ad`,
        cancel_url: `${origin}/payment-failure?reason=cancelled`,
      });
      return Response.json({ redirectUrl: session.url });
    }

    return Response.json({ error: 'Unknown checkout_type' }, { status: 400 });
  } catch (error) {
    console.error('create-checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});