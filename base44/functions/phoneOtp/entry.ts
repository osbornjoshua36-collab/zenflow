import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, phone, code } = await req.json();

    const TWILIO_SID = Deno.env.get('Twilio_account_SID');
    const TWILIO_TOKEN = Deno.env.get('Twilio_Auth_token');
    const TWILIO_FROM = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (action === 'send') {
      if (!phone) return Response.json({ error: 'Phone required' }, { status: 400 });

      // Generate 6-digit code
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Invalidate old unused codes for this phone
      const existing = await base44.asServiceRole.entities.OtpCode.filter({ phone, used: false });
      for (const rec of existing) {
        await base44.asServiceRole.entities.OtpCode.update(rec.id, { used: true });
      }

      // Save new code
      await base44.asServiceRole.entities.OtpCode.create({ phone, code: otp, expires_at: expiresAt, used: false });

      // Send SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const body = new URLSearchParams({
        From: TWILIO_FROM,
        To: phone,
        Body: `Your verification code is: ${otp}. It expires in 10 minutes.`
      });

      const smsRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      if (!smsRes.ok) {
        const err = await smsRes.text();
        console.error('Twilio error:', err);
        return Response.json({ error: 'Failed to send SMS' }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    if (action === 'verify') {
      if (!phone || !code) return Response.json({ error: 'Phone and code required' }, { status: 400 });

      const records = await base44.asServiceRole.entities.OtpCode.filter({ phone, used: false });
      const now = new Date();

      const match = records.find(r => r.code === code && new Date(r.expires_at) > now);
      if (!match) return Response.json({ valid: false, error: 'Invalid or expired code' }, { status: 400 });

      await base44.asServiceRole.entities.OtpCode.update(match.id, { used: true });
      return Response.json({ valid: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('phoneOtp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});