import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, email, code } = body;

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    if (action === 'send') {
      // Check rate limit: max 3 sends per email in 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const recent = await base44.asServiceRole.entities.OtpCode.filter({ phone: `email:${email}`, used: false });
      const recentCount = recent.filter(o => o.created_date > fifteenMinsAgo).length;
      if (recentCount >= 3) {
        return Response.json({ success: false, error: "You've requested too many codes. Please wait 15 minutes before trying again.", rate_limited: true });
      }

      // Invalidate existing unused OTPs for this email
      for (const otp of recent) {
        await base44.asServiceRole.entities.OtpCode.update(otp.id, { used: true });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.OtpCode.create({ phone: `email:${email}`, code: otpCode, expires_at: expiresAt, used: false });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Your verification code',
        body: `<p>Your verification code is:</p><h2 style="letter-spacing:8px;font-size:32px;">${otpCode}</h2><p>This code expires in 10 minutes. Do not share it with anyone.</p>`
      });

      console.log(`[emailOtp] Sent OTP to ${email}`);
      return Response.json({ success: true });
    }

    if (action === 'verify') {
      const now = new Date();
      const otps = await base44.asServiceRole.entities.OtpCode.filter({ phone: `email:${email}`, used: false });
      const valid = otps.find(o => o.code === code && new Date(o.expires_at) > now);
      if (valid) {
        await base44.asServiceRole.entities.OtpCode.update(valid.id, { used: true });
        console.log(`[emailOtp] Verified OTP for ${email}`);
        return Response.json({ valid: true });
      }
      console.log(`[emailOtp] Invalid OTP attempt for ${email}`);
      return Response.json({ valid: false, error: 'Incorrect or expired code' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[emailOtp] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});