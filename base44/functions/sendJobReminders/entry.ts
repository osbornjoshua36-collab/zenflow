import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TWILIO_ACCOUNT_SID = Deno.env.get('Twilio_account_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('Twilio_Auth_token');
const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER');

async function sendSms(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all scheduled jobs
    const scheduledJobs = await base44.asServiceRole.entities.Job.filter(
      { status: 'Scheduled' },
      'scheduled_date',
      500
    );

    const now = new Date();
    let notificationsSent = 0;
    let smsSent = 0;

    for (const job of scheduledJobs) {
      if (!job.scheduled_date || !job.business_id) continue;

      const diffMs = new Date(job.scheduled_date) - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // 24h window: 23–25 hours from now
      const is24h = diffHours >= 23 && diffHours <= 25;
      // 2h window: 1.5–2.5 hours from now
      const is2h = diffHours >= 1.5 && diffHours <= 2.5;

      if (!is24h && !is2h) continue;

      const timeLabel = is24h ? '24 hours' : '2 hours';
      const dateStr = new Date(job.scheduled_date).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      // In-app notification
      await base44.asServiceRole.entities.Notification.create({
        business_id: job.business_id,
        message: `Reminder: "${job.title}" is scheduled in ${timeLabel} on ${dateStr}.`,
        type: 'job_update',
        related_entity_id: job.id,
      });
      notificationsSent++;

      // SMS to customer — only on the 24h reminder
      if (is24h && job.customer_id) {
        try {
          const customers = await base44.asServiceRole.entities.Customer.filter({ id: job.customer_id });
          const customer = customers[0];
          if (customer?.phone) {
            // Fetch business name for a personalised message
            const businesses = await base44.asServiceRole.entities.Business.filter({ id: job.business_id });
            const businessName = businesses[0]?.business_name || businesses[0]?.name || 'your service provider';

            const smsBody = `Hi ${customer.name || 'there'}, this is a reminder from ${businessName}: your appointment "${job.title}" is tomorrow at ${new Date(job.scheduled_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Reply STOP to opt out.`;

            await sendSms(customer.phone, smsBody);
            smsSent++;
            console.log(`SMS sent for job ${job.id} to customer ${customer.name} (${customer.phone})`);
          } else {
            console.log(`No phone number for customer on job ${job.id} — skipping SMS`);
          }
        } catch (smsErr) {
          console.error(`SMS failed for job ${job.id}:`, smsErr.message);
          // Don't fail the whole run if one SMS errors
        }
      }

      console.log(`Sent ${timeLabel} reminder for job ${job.id}: ${job.title}`);
    }

    return Response.json({ success: true, notifications_sent: notificationsSent, sms_sent: smsSent });
  } catch (error) {
    console.error('Error sending job reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});