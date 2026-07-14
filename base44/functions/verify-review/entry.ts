import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { job_id, order_id, review_id } = body;

    if (!job_id && !order_id && !review_id) {
      return Response.json({ error: 'job_id, order_id, or review_id required' }, { status: 400 });
    }

    // Find the review
    let review;
    if (review_id) {
      const reviews = await base44.entities.Review.filter({ id: review_id });
      review = reviews[0];
    } else if (order_id) {
      const reviews = await base44.entities.Review.filter({ order_id });
      review = reviews[0];
    } else {
      const reviews = await base44.entities.Review.filter({ job_id });
      review = reviews[0];
    }

    if (!review) {
      return Response.json({ error: 'Review not found' }, { status: 404 });
    }

    // Require a real, completed Transaction linked to this job or order — not just a completed job status
    const transactionFilter = review.order_id
      ? { order_id: review.order_id, status: 'completed' }
      : { job_id: review.job_id, status: 'completed' };
    const transactions = await base44.asServiceRole.entities.Transaction.filter(transactionFilter);

    const hasCompletedTransaction = transactions.length > 0;

    if (hasCompletedTransaction) {
      // Mark review as verified using service role (bypasses FLS)
      await base44.asServiceRole.entities.Review.update(review.id, {
        verified: true,
      });
    }

    return Response.json({
      ok: true,
      verified: hasCompletedTransaction,
    });
  } catch (error) {
    console.error('Verify review error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});