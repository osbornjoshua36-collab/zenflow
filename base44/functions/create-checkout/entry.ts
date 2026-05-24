Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { tier, business_id, headline } = body;

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