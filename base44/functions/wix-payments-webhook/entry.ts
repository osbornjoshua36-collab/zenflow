import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WEBHOOK_PUBLIC_KEY = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');

async function verifyJWT(token) {
  if (!WEBHOOK_PUBLIC_KEY) {
    throw new Error('Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
  }

  // Use Web Crypto API for JWT verification
  const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.');

  function base64UrlDecode(str) {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw new Error('Invalid base64url string');
    }
    const binaryString = atob(output);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  function pemToArrayBuffer(pem) {
    const b64Lines = pem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .trim()
      .split('\n')
      .join('');
    return base64UrlDecode(b64Lines);
  }

  const signatureBytes = base64UrlDecode(signatureEncoded);
  const message = new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`);
  const publicKeyBuffer = pemToArrayBuffer(WEBHOOK_PUBLIC_KEY);

  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBytes,
    message
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  const payloadStr = new TextDecoder().decode(base64UrlDecode(payloadEncoded));
  return JSON.parse(payloadStr);
}

const COMMISSION_DEFAULTS = {
  services: { starter: 8, pro: 5, business: 3 },
  products: { starter: 6, pro: 4, business: 2 },
};

// Resolve the commission % for a transaction by looking up the seller's Business:
// business_type (services | products) × subscription_plan (starter | pro | business).
// Individual sellers with no Business get the Products-Starter rate (free goods tier).
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const decoded = await verifyJWT(body);

    // Decode double-nested JSON (WebhookEnvelope -> event)
    const envelope = JSON.parse(decoded.data);
    const eventData = JSON.parse(envelope.data);

    if (envelope.eventType === 'wix.ecom.v1.order_approved') {
      const order = eventData.actionEvent.body.order;
      const base44 = createClientFromRequest(req);

      console.log(`Processing order ${order.id} - checkout ${order.checkoutId}`);

      // Check for job payment
      const jobPaymentItem = order.lineItems.find(item =>
        item.productName?.original?.startsWith('JobPayment|')
      );
      if (jobPaymentItem) {
        const parts = jobPaymentItem.productName.original.split('|');
        const jobId = parts[1];
        const invoiceId = parts[2];
        const sellerBusinessId = parts[3] || null;
        const buyerEmail = order.buyerInfo?.email || null;
        const grossAmount = parseFloat(order.priceSummary?.total?.amount || jobPaymentItem.price?.amount || 0);

        // Tier-based commission: services ladder by subscription plan
        const commissionRate = await getCommissionRate(base44, sellerBusinessId);

        const commissionAmount = parseFloat((grossAmount * commissionRate / 100).toFixed(2));
        const netAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));

        // Hold period (default 2 business days)
        const holdConfigs = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'payout_hold_days' });
        const holdDays = holdConfigs.length > 0 ? parseInt(holdConfigs[0].value) || 2 : 2;
        const holdUntil = new Date();
        holdUntil.setDate(holdUntil.getDate() + holdDays);

        // Create Transaction record
        await base44.asServiceRole.entities.Transaction.create({
          job_id: jobId,
          invoice_id: invoiceId,
          buyer_email: buyerEmail,
          seller_business_id: sellerBusinessId,
          gross_amount: grossAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          status: 'completed',
          wix_order_id: order.id,
          payout_hold_until: holdUntil.toISOString(),
        });

        // Mark invoice as Paid
        if (invoiceId) {
          await base44.asServiceRole.entities.Invoice.update(invoiceId, {
            status: 'Paid',
            paid_date: new Date().toISOString(),
            payment_method: 'Stripe',
          });
        }

        console.log(`Job payment processed: job=${jobId} invoice=${invoiceId} gross=${grossAmount} commission=${commissionAmount} net=${netAmount}`);
        return new Response('OK', { status: 200 });
      }

      // Check for product order payment (name format: OrderPayment|orderId|productId)
      const orderPaymentItem = order.lineItems.find(item =>
        item.productName?.original?.startsWith('OrderPayment|')
      );
      if (orderPaymentItem) {
        const parts = orderPaymentItem.productName.original.split('|');
        const orderId = parts[1];
        const productId = parts[2];
        const buyerEmail = order.buyerInfo?.email || null;
        const grossAmount = parseFloat(order.priceSummary?.total?.amount || orderPaymentItem.price?.amount || 0);

        // Look up the product to find the seller
        const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
        const product = products[0];
        const sellerBusinessId = product?.business_id || null;
        const sellerEmail = product?.seller_email || null;

        // Tier-based commission: products ladder by subscription plan (or Products-Starter for individuals)
        const commissionRate = await getCommissionRate(base44, sellerBusinessId);

        const commissionAmount = parseFloat((grossAmount * commissionRate / 100).toFixed(2));
        const netAmount = parseFloat((grossAmount - commissionAmount).toFixed(2));

        // Hold period (default 2 business days)
        const holdConfigs = await base44.asServiceRole.entities.PlatformConfig.filter({ key: 'payout_hold_days' });
        const holdDays = holdConfigs.length > 0 ? parseInt(holdConfigs[0].value) || 2 : 2;
        const holdUntil = new Date();
        holdUntil.setDate(holdUntil.getDate() + holdDays);

        // Create Transaction record linked to the order
        await base44.asServiceRole.entities.Transaction.create({
          order_id: orderId,
          buyer_email: buyerEmail,
          seller_business_id: sellerBusinessId,
          seller_email: sellerEmail,
          gross_amount: grossAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          status: 'completed',
          wix_order_id: order.id,
          payout_hold_until: holdUntil.toISOString(),
        });

        // Mark the Order as Paid
        await base44.asServiceRole.entities.Order.update(orderId, { status: 'Paid' });

        console.log(`Order payment processed: order=${orderId} product=${productId} gross=${grossAmount} commission=${commissionAmount} net=${netAmount}`);
        return new Response('OK', { status: 200 });
      }

      // Check if this is a SaaS plan purchase (Pro/Business)
      const saasItem = order.lineItems.find(item =>
        item.productName?.original?.includes('Plan Monthly')
      );

      if (saasItem) {
        // SaaS subscription — activate on the matching Business by buyer email
        const buyerEmail = order.buyerInfo?.email;
        console.log(`SaaS subscription order for: ${buyerEmail}`);
        if (buyerEmail) {
          const businesses = await base44.asServiceRole.entities.Business.filter({ owner_email: buyerEmail });
          if (businesses.length > 0) {
            const planMap = {
              'Pro Plan Monthly': 'pro',
              'Business Plan Monthly': 'business',
            };
            const plan = planMap[saasItem.productName.original] || 'pro';
            const subscriptionId = saasItem.subscriptionInfo?.id;
            await base44.asServiceRole.entities.Business.update(businesses[0].id, {
              subscription_plan: plan,
              subscription_plan_id: plan + '_monthly',
              base44_subscription_id: subscriptionId || null,
              subscription_status: 'active',
            });
            console.log(`SaaS ${plan} plan activated for business: ${businesses[0].id}`);
          }
        }
      } else {
        // Ad subscription — existing logic
        for (const lineItem of order.lineItems) {
          if (lineItem.subscriptionInfo?.id) {
            const subscriptionId = lineItem.subscriptionInfo.id;
            console.log(`Ad subscription created: ${subscriptionId}`);
          }
        }
      }

      // Check for listing boost purchase (name format: Boost|tier|listingId)
      const boostItem = order.lineItems.find(item =>
        item.productName?.original?.startsWith('Boost|')
      );
      if (boostItem) {
        const parts = boostItem.productName.original.split('|');
        const boostTier = parts[1];
        const listingId = parts[2];
        const daysToAdd = boostTier === '7day' ? 7 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysToAdd);
        await base44.asServiceRole.entities.Listing.update(listingId, {
          boosted: true,
          boost_tier: boostTier,
          boost_expires_at: expiresAt.toISOString(),
        });
        console.log(`Listing ${listingId} boosted (${boostTier}), expires: ${expiresAt.toISOString()}`);
      }

      return new Response('OK', { status: 200 });
    } else if (envelope.eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_canceled') {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const base44 = createClientFromRequest(req);
      const subscriptionId = subscriptionContract.id;
      console.log(`Subscription canceled: ${subscriptionId}`);

      // Check if this is a SaaS subscription cancellation
      const saasBusinesses = await base44.asServiceRole.entities.Business.filter({ base44_subscription_id: subscriptionId });
      if (saasBusinesses.length > 0) {
        await base44.asServiceRole.entities.Business.update(saasBusinesses[0].id, {
          subscription_status: 'canceled',
          subscription_plan: 'starter',
        });
        console.log(`SaaS subscription canceled for business: ${saasBusinesses[0].id}`);
      } else {
        // Ad subscription canceled — no active handler yet
        console.log(`Ad subscription canceled: ${subscriptionId}`);
      }

      return new Response('OK', { status: 200 });
    } else if (envelope.eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_expired') {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const base44 = createClientFromRequest(req);
      const subscriptionId = subscriptionContract.id;
      console.log(`Subscription expired: ${subscriptionId}`);

      // Check if this is a SaaS subscription expiry
      const saasBusinesses = await base44.asServiceRole.entities.Business.filter({ base44_subscription_id: subscriptionId });
      if (saasBusinesses.length > 0) {
        await base44.asServiceRole.entities.Business.update(saasBusinesses[0].id, {
          subscription_status: 'canceled',
          subscription_plan: 'starter',
        });
        console.log(`SaaS subscription expired for business: ${saasBusinesses[0].id}`);
      } else {
        console.log(`Ad subscription expired: ${subscriptionId}`);
      }

      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    return new Response('Internal server error', { status: 500 });
  }
});