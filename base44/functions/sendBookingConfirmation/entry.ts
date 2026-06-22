import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data: job } = body;

    if (!job || !job.customer_id || !job.business_id) {
      return Response.json({ skipped: true, reason: 'Missing job, customer, or business data' });
    }

    // Only send for Scheduled jobs
    if (job.status !== 'Scheduled') {
      return Response.json({ skipped: true, reason: 'Job is not Scheduled' });
    }

    // Fetch customer and business in parallel
    const [customers, businesses] = await Promise.all([
      base44.asServiceRole.entities.Customer.filter({ id: job.customer_id }),
      base44.asServiceRole.entities.Business.filter({ id: job.business_id }),
    ]);

    const customer = customers[0];
    const business = businesses[0];

    if (!customer?.email) {
      console.log(`No email for customer ${job.customer_id} — skipping confirmation`);
      return Response.json({ skipped: true, reason: 'No customer email' });
    }

    const businessName = business?.business_name || business?.name || 'Your Service Provider';
    const businessPhone = business?.business_phone || business?.owner_phone || '';

    const dateStr = job.scheduled_date
      ? new Date(job.scheduled_date).toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

    const durationText = job.duration_minutes
      ? `${job.duration_minutes} minutes`
      : job.estimated_duration_hours
      ? `${job.estimated_duration_hours} hour${job.estimated_duration_hours !== 1 ? 's' : ''}`
      : null;

    const body_html = `
Hi ${customer.name || 'there'},

Your booking has been confirmed! Here are the details:

📋 Service: ${job.title}
📅 Date & Time: ${dateStr}${durationText ? `\n⏱ Duration: ${durationText}` : ''}${job.technician_name ? `\n👤 Technician: ${job.technician_name}` : ''}${customer.address ? `\n📍 Address: ${customer.address}` : ''}${job.notes_shared ? `\n📝 Notes: ${job.notes_shared}` : ''}

If you have any questions, please contact us${businessPhone ? ` at ${businessPhone}` : ''}.

Thank you for choosing ${businessName}!
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customer.email,
      from_name: businessName,
      subject: `Booking Confirmed: ${job.title} on ${new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      body: body_html,
    });

    console.log(`Confirmation email sent to ${customer.email} for job ${job.id}`);
    return Response.json({ success: true, sent_to: customer.email });
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});