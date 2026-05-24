Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { checkout_type, tier, business_id, headline, subscription_plan_id } = body;

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
              thankYouPageUrl: `${origin}/seller/subscription?status=success`,
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
            thankYouPageUrl: `${origin}/seller/ads?status=success`,
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