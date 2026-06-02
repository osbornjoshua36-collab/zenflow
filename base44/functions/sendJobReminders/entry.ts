import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    let sent = 0;

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

      const message = `Reminder: "${job.title}" is scheduled in ${timeLabel} on ${dateStr}.`;

      await base44.asServiceRole.entities.Notification.create({
        business_id: job.business_id,
        message,
        type: 'job_update',
        related_entity_id: job.id,
      });

      console.log(`Sent ${timeLabel} reminder for job ${job.id}: ${job.title}`);
      sent++;
    }

    return Response.json({ success: true, reminders_sent: sent });
  } catch (error) {
    console.error('Error sending job reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});