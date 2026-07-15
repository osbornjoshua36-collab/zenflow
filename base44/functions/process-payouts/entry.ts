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

// Look up the seller's active Connect account id for a Transaction.
async function getConnectAccountId(base44, txn) {
  if (txn.seller_business_id) {
    const bs = await base44.asServiceRole.entities.Business.filter({ id: txn.seller_business_id });
    if (bs[0]?.stripe_connect_account_id && bs[0]?.stripe_connect_status === 'active') {
      return bs[0].stripe_connect_account_id;
    }
  }
  if (txn.seller_email) {
    const ps = await base44.asServiceRole.entities.BuyerProfile.filter({ email: txn.seller_email });
    if (ps[0]?.stripe_connect_account_id && ps[0]?.stripe_connect_status === 'active') {
      return ps[0].stripe_connect_account_id;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Scheduled runs have no user; allow those. Block non-admin HTTP callers.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const txns = await base44.asServiceRole.entities.Transaction.filter({ status: 'completed' }, '-created_date', 500);

    let paid = 0;
    let skipped = 0;

    for (const t of txns) {
      // Already paid out.
      if (t.stripe_transfer_id) { skipped++; continue; }
      // Hold period not elapsed.
      if (!t.payout_hold_until || new Date(t.payout_hold_until) > now) { skipped++; continue; }
      // Open dispute / guarantee claim blocks payout.
      if (t.guarantee_claim_id) { skipped++; continue; }
      // Nothing to pay out.
      if (!t.net_amount || t.net_amount <= 0) { skipped++; continue; }
      const cents = Math.round(t.net_amount * 100);
      if (cents < 50) { skipped++; continue; }

      const accountId = await getConnectAccountId(base44, t);
      if (!accountId) { skipped++; continue; }

      try {
        const transfer = await stripePost('/transfers', {
          amount: cents,
          currency: 'usd',
          destination: accountId,
          'metadata[transaction_id]': t.id,
          'metadata[checkout_type]': t.job_id ? 'job_payment' : (t.order_id ? 'order_payment' : 'boost'),
        });
        await base44.asServiceRole.entities.Transaction.update(t.id, {
          stripe_transfer_id: transfer.id,
          payout_initiated_at: now.toISOString(),
        });
        paid++;
        console.log(`Transfer created: ${transfer.id} -> ${accountId} for txn ${t.id}`);
      } catch (e) {
        console.error(`Transfer failed for txn ${t.id}:`, e.message);
        skipped++;
      }
    }

    return Response.json({ processed: paid, skipped, checked: txns.length });
  } catch (error) {
    console.error('process-payouts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});