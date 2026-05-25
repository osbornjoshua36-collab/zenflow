import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Wave delay config (hours after request creation)
const WAVE_DELAYS = [0, 4, 12, 24];
const MAX_RESPONSES = 5;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body = {};
  try { body = await req.json(); } catch (_) {}

  // Support direct call, entity automation, or scheduled trigger
  const requestId = body.service_request_id || body.event?.entity_id || body.data?.id;

  if (!requestId) {
    return Response.json({ error: 'service_request_id required' }, { status: 400 });
  }

  console.log(`[calculateMatchScore] Processing request: ${requestId}`);

  try {
    // 1. Load service request
    let sr;
    try {
      const srList = await base44.asServiceRole.entities.ServiceRequest.filter({ id: requestId });
      sr = srList[0];
    } catch (e) {
      console.log(`[calculateMatchScore] Could not fetch ServiceRequest: ${e.message}`);
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }

    if (!sr) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }

    if (sr.wave_status === 'closed' || sr.wave_status === 'expired') {
      return Response.json({ ok: true, message: 'Request already closed/expired, skipping.' });
    }

    // 2. Load all active businesses + their scores
    const [allBusinesses, allScores, platformConfigs] = await Promise.all([
      base44.asServiceRole.entities.Business.filter({ status: 'Active' }, '-created_date', 200),
      base44.asServiceRole.entities.SellerScore.list('-last_calculated', 200),
      base44.asServiceRole.entities.PlatformConfig.filter({ category: 'leads' }),
    ]);

    // Build score lookup map
    const scoreMap = {};
    for (const s of allScores) scoreMap[s.business_id] = s;

    // Config overrides
    const getConfig = (key, fallback) => {
      const c = platformConfigs.find(p => p.key === key);
      return c ? parseFloat(c.value) : fallback;
    };

    const wQuality = getConfig('weight_quality', 0.4);
    const wSpeed   = getConfig('weight_speed',   0.3);
    const wPrice   = getConfig('weight_price',   0.3);

    // Membership multipliers
    const MULTIPLIERS = { business: 1.3, pro: 1.15, starter: 1.0 };

    // Priority mode weight overrides
    const PRIORITY_WEIGHTS = {
      'Quality first': { q: 0.6, s: 0.2, p: 0.2 },
      'Speed first':   { q: 0.2, s: 0.6, p: 0.2 },
      'Best value':    { q: 0.2, s: 0.2, p: 0.6 },
      'Balanced':      { q: wQuality, s: wSpeed, p: wPrice },
    };

    const weights = PRIORITY_WEIGHTS[sr.priority_mode || 'Balanced'];

    // 3. Score each seller
    const scored = [];
    for (const biz of allBusinesses) {
      // Skip if not in same industry
      if (biz.industry !== sr.industry) continue;
      // Skip if not verified (optional soft filter)
      if (biz.verification_status === 'suspended') continue;

      const sc = scoreMap[biz.id];
      const quality = sc?.quality_score ?? 50;
      const speed   = sc?.speed_score   ?? 50;
      const price   = sc?.price_score   ?? 50;

      const composite = quality * weights.q + speed * weights.s + price * weights.p;
      const multiplier = MULTIPLIERS[biz.subscription_plan] ?? 1.0;
      const finalScore = composite * multiplier;

      // Skip sellers not accepting jobs
      if (sc?.accepting_new_jobs === false) continue;

      scored.push({ business_id: biz.id, quality, speed, price, composite, finalScore });
    }

    // Sort descending
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // 4. Assign to waves (top sellers get earlier waves)
    const perWave = Math.ceil(scored.length / WAVE_DELAYS.length);
    const now = new Date(sr.created_date || Date.now());

    const wavesToCreate = [];
    for (let w = 0; w < WAVE_DELAYS.length; w++) {
      const chunk = scored.slice(w * perWave, (w + 1) * perWave);
      if (chunk.length === 0) break;

      const scheduledAt = new Date(now.getTime() + WAVE_DELAYS[w] * 60 * 60 * 1000);

      wavesToCreate.push({
        service_request_id: sr.id,
        wave_number: w + 1,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        seller_ids: chunk.map(c => c.business_id),
        seller_scores: chunk,
      });
    }

    // 5. Create wave notifications
    for (const wave of wavesToCreate) {
      await base44.asServiceRole.entities.WaveNotification.create(wave);
    }

    // 6. Update service request with matched sellers + wave status
    await base44.asServiceRole.entities.ServiceRequest.update(sr.id, {
      matched_sellers: scored.map(s => s.business_id),
      scoring_completed_at: new Date().toISOString(),
      wave_status: 'in_flight',
    });

    console.log(`[calculateMatchScore] Done. ${scored.length} sellers scored, ${wavesToCreate.length} waves created.`);

    return Response.json({
      ok: true,
      sellers_scored: scored.length,
      waves_created: wavesToCreate.length,
    });

  } catch (err) {
    console.error(`[calculateMatchScore] Error: ${err.message}`);
    return Response.json({ error: err.message }, { status: 500 });
  }
});