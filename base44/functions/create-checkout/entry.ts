Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { checkout_type, tier, business_id, headline, subscription_plan_id } = body;

    // ── Job payment checkout path ─────────────────────────────────────────────
    if (checkout_type === 'job_payment') {
      const { job_id, invoice_id, amount, seller_business_id } = body;
      if (!job_id || !invoice_id || !amount) {
        return Response.json({ error: 'Missing job_id, invoice_id or amount' }, { status: 400 });
      }
      const origin = req.headers.get('origin') || 'https://sphere.base44.app';
      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
            'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
          },
          body: JSON.stringify({
            cart: {
              items: [{
                name: `JobPayment|${job_id}|${invoice_id}|${seller_business_id || ''}`,
                quantity: 1,
                price: parseFloat(amount).toFixed(2),
              }],
            },
            callbackUrls: {
              postFlowUrl: `${origin}/buyer/dashboard`,
              thankYouPageUrl: `${origin}/payment-success?plan_type=job&job_id=${job_id}&amount=${amount}`,
              errorUrl: `${origin}/payment-failure?reason=declined`,
            },
          }),
        }
      );
      if (!checkoutResponse.ok) {
        const err = await checkoutResponse.json();
        console.error('Job payment checkout error:', err);
        return Response.json({ error: 'Checkout creation failed' }, { status: 500 });
      }
      const data = await checkoutResponse.json();
      return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
    }

    // ── Order (product) payment checkout path ────────────────────────────────
    if (checkout_type === 'order_payment') {
      const { order_id, product_id, amount } = body;
      if (!order_id || !product_id || !amount) {
        return Response.json({ error: 'Missing order_id, product_id or amount' }, { status: 400 });
      }
      if (parseFloat(amount) < 0.50) {
        return Response.json({ error: 'Amount must be at least $0.50' }, { status: 400 });
      }
      const origin = req.headers.get('origin') || 'https://sphere.base44.app';
      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
            'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
          },
          body: JSON.stringify({
            cart: {
              items: [{
                name: `OrderPayment|${order_id}|${product_id}`,
                quantity: 1,
                price: parseFloat(amount).toFixed(2),
              }],
            },
            callbackUrls: {
              postFlowUrl: `${origin}/`,
              thankYouPageUrl: `${origin}/payment-success?plan_type=order&order_id=${order_id}&amount=${amount}`,
              errorUrl: `${origin}/payment-failure?reason=declined`,
            },
          }),
        }
      );
      if (!checkoutResponse.ok) {
        const err = await checkoutResponse.json();
        console.error('Order payment checkout error:', err);
        return Response.json({ error: 'Checkout creation failed' }, { status: 500 });
      }
      const data = await checkoutResponse.json();
      return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
    }

    // ── Subscription checkout path ──────────────────────────────────────────
    if (checkout_type === 'subscription') {
      const SUBSCRIPTION_PLANS = {
        'pro_monthly':      { name: 'Pro Plan Monthly',      price: '49.00' },
        'business_monthly': { name: 'Business Plan Monthly', price: '99.00' },
      };
      const plan = SUBSCRIPTION_PLANS[subscription_plan_id];
      if (!plan) {
        return Response.json({ error: 'Invalid subscription plan ID' }, { status: 400 });
      }
      const origin = req.headers.get('origin') || 'https://sphere.base44.app';
      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
            'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
          },
          body: JSON.stringify({
            cart: {
              items: [{
                name: plan.name,
                quantity: 1,
                price: plan.price,
                subscriptionInfo: {
                  subscriptionSettings: { frequency: 'MONTH' },
                  title: plan.name,
                  description: `Auto-renewing monthly ${plan.name}`,
                },
              }],
            },
            callbackUrls: {
              postFlowUrl: `${origin}/seller/subscription`,
              thankYouPageUrl: `${origin}/payment-success?plan_type=subscription`,
              errorUrl: `${origin}/payment-failure?reason=declined`,
            },
          }),
        }
      );
      if (!checkoutResponse.ok) {
        const err = await checkoutResponse.json();
        console.error('Subscription checkout error:', err);
        return Response.json({ error: 'Checkout creation failed' }, { status: 500 });
      }
      const data = await checkoutResponse.json();
      return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
    }

    // ── Boost checkout path ────────────────────────────────────────────────────
    if (checkout_type === 'boost') {
      const { listing_id, boost_tier } = body;
      if (!listing_id || !boost_tier) {
        return Response.json({ error: 'Missing listing_id or boost_tier' }, { status: 400 });
      }
      const boostPrice = boost_tier === '7day' ? '15.00' : '39.00';
      const origin = req.headers.get('origin') || 'https://sphere.base44.app';
      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
            'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
          },
          body: JSON.stringify({
            cart: {
              items: [{
                name: `Boost|${boost_tier}|${listing_id}`,
                quantity: 1,
                price: boostPrice,
              }],
            },
            callbackUrls: {
              postFlowUrl: `${origin}/seller/listings`,
              thankYouPageUrl: `${origin}/payment-success?plan_type=boost`,
              errorUrl: `${origin}/payment-failure?reason=declined`,
            },
          }),
        }
      );
      if (!checkoutResponse.ok) {
        const err = await checkoutResponse.json();
        console.error('Boost checkout error:', err);
        return Response.json({ error: 'Checkout creation failed' }, { status: 500 });
      }
      const data = await checkoutResponse.json();
      return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
    }

    // ── Ad checkout path (existing) ──────────────────────────────────────────
    // Tier pricing
    const pricing = {
      'Banner': '49.99',
      'Featured': '29.99',
      'Spotlight': '19.99',
    };

    if (!pricing[tier]) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get origin from request headers for redirect URLs
    const origin = req.headers.get('origin') || 'https://sphere.base44.app';
    
    // Construct checkout session
    const checkoutResponse = await fetch(
      'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': Deno.env.get('WIX_PAYMENTS_API_KEY'),
          'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID'),
        },
        body: JSON.stringify({
          cart: {
            items: [
              {
                name: `${tier} Ad - ${headline || 'Service Promotion'}`,
                quantity: 1,
                price: pricing[tier],
                subscriptionInfo: {
                  subscriptionSettings: {
                    frequency: 'MONTH',
                  },
                  title: `${tier} Ad Monthly Subscription`,
                  description: `Auto-renewing monthly ${tier} tier ad placement on Sphere Community Hub`,
                },
              },
            ],
          },
          callbackUrls: {
            postFlowUrl: `${origin}/seller/ads`,
            thankYouPageUrl: `${origin}/payment-success?plan_type=${tier.toLowerCase()}`,
            errorUrl: `${origin}/payment-failure?reason=declined`,
          },
        }),
      }
    );

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.json();
      console.error('Wix Checkout Error:', error);
      return Response.json({ error: 'Checkout creation failed' }, { status: 500 });
    }

    const data = await checkoutResponse.json();
    return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
  } catch (error) {
    console.error('Error creating checkout:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});