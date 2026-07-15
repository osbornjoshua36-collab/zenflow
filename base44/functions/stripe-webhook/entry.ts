import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Webhook signature verification (Web Crypto HMAC-SHA256) ───────────────────
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) throw new Error('Missing signature or webhook secret');
  const parts = {};
  sigHeader.split(',').forEach((p) => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error('Invalid Stripe signature header');
  const signedPayload = `${timestamp}.${payload}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === v1;
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

// ── Commission resolution (tier × business type) ─────────────────────────────
const COMMISSION_DEFAULTS = {
  services: { starter: 8, pro: 5, business: 3 },
  products: { starter: 6, pro: 4, business: 2 },
};

async function getCommissionRate(base44, sellerBusinessId) {
  if (!sellerBusinessId) return COMMISSION_DEFAULTS.products.starter;
  const businesses = await base44.asServiceRole.entities.Business.filter({ id: sellerBusinessId });
  const business = businesses[0];
  if (!business) return COMMISSION_DEFAULTS.products.starter;
  const businessType = business.business_type || 'services';
  const plan = (business.subscription_plan || 'starter').toLowerCase();
  const cfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: `commission_rate_${businessType}_${plan}` });
  if (cfg.length > 0) return parseFloat(cfg[0].value) || 0;
  return COMMISSION_DEFAULTS[businessType]?.[plan] ?? 0;
}

async function getPayoutHoldDays(base44) {
  const cfg = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'payout_hold_days' });
  return cfg.length > 0 ? (parseInt(cfg[0].value) || 2) : 2;
}

function mapConnectStatus(acct) {
  if (acct.charges_enabled) return 'active';
  if (acct.details_submitted && !acct.charges_enabled) return 'restricted';
  return 'pending';
}

// Create a Transaction record for a marketplace charge (job / order / boost).
async function recordTransaction(base44, { type, gross, sellerBusinessId, sellerEmail, buyerEmail, refId, chargeId }) {
  const commissionRate = await getCommissionRate(base44, sellerBusinessId);
  const grossAmount = parseFloat(gross);
  const commissionAmount = parseFloat((grossAmount * commissionRate / 100).toFixed(2));
  const netAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));
  const holdDays = await getPayoutHoldDays(base44);
  const holdUntil = new Date();
  holdUntil.setDate(holdUntil.getDate() + holdDays);

  const txn = {
    buyer_email: buyerEmail,
    seller_business_id: sellerBusinessId || null,
    seller_email: sellerEmail || null,
    gross_amount: grossAmount,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    status: 'completed',
    stripe_charge_id: chargeId,
    payout_hold_until: holdUntil.toISOString(),
  };
  if (type === 'job') { txn.job_id = refId; }
  else if (type === 'order') { txn.order_id = refId; }
  return base44.asServiceRole.entities.Transaction.create(txn);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const raw = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    try {
      const valid = await verifyStripeSignature(raw, sigHeader, secret);
      if (!valid) return new Response('Invalid signature', { status: 400 });
      event = JSON.parse(raw);
    } catch (verifyErr) {
      console.error('Webhook verification failed:', verifyErr.message);
      return new Response('Signature verification failed', { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const type = event.type;
    const obj = event.data.object;

    // ── Successful one-time charges ──────────────────────────────────────────
    if (type === 'checkout.session.completed') {
      const sess = obj;
      const m = sess.metadata || {};
      const chargeId = sess.payment_intent || (sess.payment_link ? null : null);

      if (sess.mode === 'payment' && sess.payment_status === 'paid') {
        const gross = (sess.amount_total || 0) / 100;
        const buyerEmail = sess.customer_details?.email || sess.customer_email || null;

        if (m.checkout_type === 'job_payment') {
          await recordTransaction(base44, {
            type: 'job', gross, sellerBusinessId: m.seller_business_id, buyerEmail,
            refId: m.job_id, chargeId,
          });
          if (m.invoice_id) {
            await base44.asServiceRole.entities.Invoice.update(m.invoice_id, {
              status: 'Paid', paid_date: new Date().toISOString(), payment_method: 'Stripe',
            });
          }
          console.log(`Job payment processed: job=${m.job_id} gross=${gross}`);
        } else if (m.checkout_type === 'order_payment') {
          await recordTransaction(base44, {
            type: 'order', gross, sellerBusinessId: m.seller_business_id, sellerEmail: m.seller_email,
            buyerEmail, refId: m.order_id, chargeId,
          });
          await base44.asServiceRole.entities.Order.update(m.order_id, { status: 'Paid' });
          console.log(`Order payment processed: order=${m.order_id} gross=${gross}`);
        } else if (m.checkout_type === 'boost') {
          // Boost fee charged through Connect (per spec): record a payable Transaction.
          const sellerBizId = m.seller_business_id;
          let boostBuyerEmail = buyerEmail;
          if (!boostBuyerEmail && sellerBizId) {
            const bs = await base44.asServiceRole.entities.Business.filter({ id: sellerBizId });
            boostBuyerEmail = bs[0]?.owner_email || null;
          }
          await recordTransaction(base44, {
            type: 'boost', gross, sellerBusinessId: sellerBizId, buyerEmail: boostBuyerEmail,
            refId: null, chargeId,
          });
          const daysToAdd = m.boost_tier === '7day' ? 7 : 30;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + daysToAdd);
          await base44.asServiceRole.entities.Listing.update(m.listing_id, {
            boosted: true, boost_tier: m.boost_tier, boost_expires_at: expiresAt.toISOString(),
          });
          console.log(`Boost processed: listing=${m.listing_id} gross=${gross}`);
        } else if (m.checkout_type === 'ai_credits') {
          const aiBusinessId = m.business_id || null;
          const aiSellerEmail = m.seller_email || null;
          const packSize = parseInt(m.pack_size) || 50;
          const creditFilter = aiBusinessId ? { business_id: aiBusinessId } : { seller_email: aiSellerEmail };
          let creditRecords = await base44.asServiceRole.entities.AiImageCredit.filter(creditFilter);
          const creditRecord = creditRecords[0];
          if (!creditRecord) {
            await base44.asServiceRole.entities.AiImageCredit.create({
              ...(aiBusinessId ? { business_id: aiBusinessId } : {}),
              ...(aiSellerEmail ? { seller_email: aiSellerEmail } : {}),
              monthly_generations_used: 0,
              current_period_start: new Date().toISOString().slice(0, 10),
              purchased_credits_balance: packSize,
            });
          } else {
            await base44.asServiceRole.entities.AiImageCredit.update(creditRecord.id, {
              purchased_credits_balance: (creditRecord.purchased_credits_balance || 0) + packSize,
            });
          }
          console.log(`AI credits topped up: +${packSize}`);
        }
        return new Response('OK', { status: 200 });
      }

      if (sess.mode === 'subscription') {
        if (m.checkout_type === 'subscription') {
          const sub = await stripeGet(`/subscriptions/${sess.subscription}`);
          const updates = {
            subscription_plan: m.plan,
            subscription_plan_id: (m.plan || '') + '_monthly',
            base44_subscription_id: sess.subscription,
            subscription_status: 'active',
            subscription_end_date: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          };
          if (m.business_id) {
            await base44.asServiceRole.entities.Business.update(m.business_id, updates);
            console.log(`SaaS ${m.plan} plan activated for business: ${m.business_id}`);
          }
        } else if (m.checkout_type === 'ad') {
          if (m.ad_id) {
            const end = new Date();
            end.setDate(end.getDate() + 30);
            await base44.asServiceRole.entities.Ad.update(m.ad_id, {
              status: 'Active', start_date: new Date().toISOString(), end_date: end.toISOString(),
            });
            console.log(`Ad activated: ${m.ad_id}`);
          }
        }
        return new Response('OK', { status: 200 });
      }
    }

    // ── Recurring subscription renewal ────────────────────────────────────────
    if (type === 'invoice.paid') {
      const subId = obj.subscription;
      if (subId) {
        const sub = await stripeGet(`/subscriptions/${subId}`);
        const sm = sub.metadata || {};
        if (sm.checkout_type === 'subscription' && sm.business_id) {
          await base44.asServiceRole.entities.Business.update(sm.business_id, {
            subscription_status: 'active',
            subscription_end_date: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        } else if (sm.checkout_type === 'ad' && sm.ad_id) {
          const end = new Date();
          end.setDate(end.getDate() + 30);
          await base44.asServiceRole.entities.Ad.update(sm.ad_id, {
            status: 'Active', end_date: end.toISOString(),
          });
        }
      }
      return new Response('OK', { status: 200 });
    }

    // ── Subscription lifecycle (past due / canceled / expired) ───────────────
    if (type === 'customer.subscription.updated') {
      const sub = obj;
      const sm = sub.metadata || {};
      const businesses = sm.business_id
        ? await base44.asServiceRole.entities.Business.filter({ id: sm.business_id })
        : await base44.asServiceRole.entities.Business.filter({ base44_subscription_id: sub.id });
      const business = businesses[0];
      if (business) {
        let status = business.subscription_status;
        if (sub.status === 'active' || sub.status === 'trialing') status = 'active';
        else if (sub.status === 'past_due') status = 'past_due';
        else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
          status = 'cancelled';
        }
        const updates = { subscription_status: status };
        if (status === 'cancelled') updates.subscription_plan = 'starter';
        if (sub.current_period_end) updates.subscription_end_date = new Date(sub.current_period_end * 1000).toISOString();
        await base44.asServiceRole.entities.Business.update(business.id, updates);
      }
      return new Response('OK', { status: 200 });
    }

    if (type === 'customer.subscription.deleted') {
      const sub = obj;
      const sm = sub.metadata || {};
      const businesses = sm.business_id
        ? await base44.asServiceRole.entities.Business.filter({ id: sm.business_id })
        : await base44.asServiceRole.entities.Business.filter({ base44_subscription_id: sub.id });
      const business = businesses[0];
      if (business) {
        await base44.asServiceRole.entities.Business.update(business.id, {
          subscription_status: 'cancelled',
          subscription_plan: 'starter',
        });
      }
      return new Response('OK', { status: 200 });
    }

    // ── Refunds / disputes block payouts ─────────────────────────────────────
    if (type === 'charge.refunded') {
      const charge = obj;
      const txns = await base44.asServiceRole.entities.Transaction.filter({ stripe_charge_id: charge.id });
      if (txns[0]) {
        const refunded = (charge.amount_refunded || 0) / 100;
        const full = (charge.amount || 0) / 100;
        await base44.asServiceRole.entities.Transaction.update(txns[0].id, {
          refund_amount: refunded,
          status: refunded >= full ? 'refunded' : 'partially_refunded',
          refunded_at: new Date().toISOString(),
        });
      }
      return new Response('OK', { status: 200 });
    }

    if (type === 'charge.dispute.created') {
      const dispute = obj;
      const txns = await base44.asServiceRole.entities.Transaction.filter({ stripe_charge_id: dispute.charge });
      if (txns[0]) {
        await base44.asServiceRole.entities.Transaction.update(txns[0].id, {
          status: 'disputed',
          guarantee_claim_id: dispute.id,
        });
      }
      return new Response('OK', { status: 200 });
    }

    // ── Connect account status updates ───────────────────────────────────────
    if (type === 'account.updated') {
      const acct = obj;
      const status = mapConnectStatus(acct);
      const businesses = await base44.asServiceRole.entities.Business.filter({ stripe_connect_account_id: acct.id });
      if (businesses[0]) {
        await base44.asServiceRole.entities.Business.update(businesses[0].id, { stripe_connect_status: status });
      }
      const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ stripe_connect_account_id: acct.id });
      if (profiles[0]) {
        await base44.asServiceRole.entities.BuyerProfile.update(profiles[0].id, { stripe_connect_status: status });
      }
      console.log(`Connect account ${acct.id} -> ${status}`);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('stripe-webhook error:', error.message);
    return new Response('Internal server error', { status: 500 });
  }
});