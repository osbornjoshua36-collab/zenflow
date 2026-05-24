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