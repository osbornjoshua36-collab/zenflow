import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateSlug } from '@/utils/sellerUtils';

export default function Step1Identity({ onComplete }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', businessName: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [screen, setScreen] = useState('form'); // form|channel|otp
  const [channel, setChannel] = useState('email');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(600); // 10 min in seconds
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [otpError, setOtpError] = useState('');
  const [otpLocked, setOtpLocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // Honeypot check
  const isBot = () => honeypot.length > 0;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatPhone = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const normalizePhone = (raw) => {
    const d = raw.replace(/\D/g, '');
    return d.startsWith('1') ? `+${d}` : `+1${d}`;
  };

  const checkDuplicateEmail = async () => {
    if (!form.email || !form.email.includes('@')) return;
    const existing = await base44.entities.Business.filter({ owner_email: form.email });
    if (existing.length > 0) {
      setErrors(e => ({ ...e, email: 'An account with this email already exists.' }));
    } else {
      setErrors(e => ({ ...e, email: undefined }));
    }
  };

  const checkDuplicatePhone = async () => {
    if (!form.phone) return;
    const n = normalizePhone(form.phone);
    const existing = await base44.entities.Business.filter({ owner_phone: n });
    if (existing.length > 0) {
      setErrors(e => ({ ...e, phone: 'This phone number is already registered.' }));
    } else {
      setErrors(e => ({ ...e, phone: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid email required';
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 10) errs.phone = 'Valid US phone number required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = () => {
    if (isBot()) { setErrors({ general: 'Something went wrong — please try again.' }); return; }
    if (!validate()) return;
    if (errors.email || errors.phone) return;
    setScreen('channel');
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(600);
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const cd = setInterval(() => {
      setResendCooldown(t => { if (t <= 1) { clearInterval(cd); return 0; } return t - 1; });
    }, 1000);
  };

  const sendCode = async () => {
    setSending(true);
    if (channel === 'email') {
      await base44.functions.invoke('emailOtp', { action: 'send', email: form.email });
    } else {
      await base44.functions.invoke('phoneOtp', { action: 'send', phone: normalizePhone(form.phone) });
    }
    setSending(false);
    setScreen('otp');
    startTimer();
    startResendCooldown();
  };

  const handleResend = async () => {
    if (resendCount >= 3) return;
    const newCount = resendCount + 1;
    setResendCount(newCount);
    setOtpDigits(['','','','','','']);
    setOtpError('');
    setSending(true);
    if (channel === 'email') {
      const res = await base44.functions.invoke('emailOtp', { action: 'send', email: form.email });
      if (res.data?.rate_limited) { setOtpLocked(true); setOtpError(res.data.error); setSending(false); return; }
    } else {
      await base44.functions.invoke('phoneOtp', { action: 'send', phone: normalizePhone(form.phone) });
    }
    setSending(false);
    startTimer();
    startResendCooldown();
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpDigits];
    next[i] = val;
    setOtpDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (text.length === 6) {
      e.preventDefault();
      setOtpDigits(text.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) return;
    setVerifying(true);
    setOtpError('');
    let res;
    if (channel === 'email') {
      res = await base44.functions.invoke('emailOtp', { action: 'verify', email: form.email, code });
    } else {
      res = await base44.functions.invoke('phoneOtp', { action: 'verify', phone: normalizePhone(form.phone), code });
    }
    setVerifying(false);
    if (res.data?.valid) {
      await createSeller();
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        setOtpLocked(true);
        setOtpError('Too many incorrect attempts. Please wait 15 minutes before trying again.');
      } else {
        setOtpError(`Incorrect code — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
      }
      setOtpDigits(['','','','','','']);
      inputRefs.current[0]?.focus();
    }
  };

  const createSeller = async () => {
    const phone = normalizePhone(form.phone);
    const slug = generateSlug(form.businessName || `${form.firstName} ${form.lastName}`);
    const me = await base44.auth.me().catch(() => null);

    const payload = {
      owner_first_name: form.firstName,
      owner_last_name: form.lastName,
      business_name: form.businessName || `${form.firstName} ${form.lastName}`,
      name: form.businessName || `${form.firstName} ${form.lastName}`,
      slug,
      owner_email: form.email,
      owner_phone: phone,
      phone,
      phone_verified: channel === 'phone',
      onboarding_status: 'incomplete',
      onboarding_step_completed: 1,
      service_radius_miles: 25,
      business_address_line1: '',
      business_city: '',
      business_state: 'NC',
      business_zip: '',
    };

    // Update existing or create
    let created;
    try {
      if (me?.email) {
        const existing = await base44.entities.Business.filter({ owner_email: me.email });
        if (existing.length > 0) {
          created = await base44.entities.Business.update(existing[0].id, payload);
          created = { ...existing[0], ...payload };
        } else {
          created = await base44.entities.Business.create(payload);
        }
      } else {
        created = await base44.entities.Business.create(payload);
      }
    } catch {
      created = await base44.entities.Business.create(payload);
    }

    // Send welcome email
    base44.integrations.Core.SendEmail({
      to: form.email,
      subject: "Welcome — let's get you set up",
      body: `<p>Hi ${form.firstName},</p><p>Your seller account is created! Let's finish setting up your profile so buyers can find you.</p><p><a href="${window.location.origin}/seller/onboarding">Continue setup →</a></p>`
    }).catch(() => {});

    onComplete(created);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const formatTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const maskedEmail = form.email.replace(/(?<=.{2}).(?=.*@)/g, '*');
  const maskedPhone = form.phone.replace(/\d(?=\d{4})/g, '*');

  if (screen === 'form') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAFCFF]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>
              Create your seller account
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Quick setup — you'll be live in minutes.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-5">
            {/* Honeypot — hidden from real users */}
            <input
              name="confirm_address"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">First name *</Label>
                <Input className="mt-1" value={form.firstName} onChange={e => set('firstName', e.target.value)} maxLength={50} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Last name *</Label>
                <Input className="mt-1" value={form.lastName} onChange={e => set('lastName', e.target.value)} maxLength={50} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Business name</Label>
              <Input className="mt-1" value={form.businessName} onChange={e => set('businessName', e.target.value)} maxLength={100} placeholder="e.g. Smith's Plumbing Co." />
              <p className="text-xs text-slate-400 mt-1">Leave blank if you operate under your own name</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Email address *</Label>
              <Input
                className="mt-1" type="email" value={form.email}
                onChange={e => { set('email', e.target.value); setErrors(er => ({ ...er, email: undefined })); }}
                onBlur={checkDuplicateEmail}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email}{errors.email.includes('already exists') && <> <a href="/" className="underline">Sign in instead →</a></>}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Phone number *</Label>
              <Input
                className="mt-1" type="tel"
                value={form.phone}
                onChange={e => { set('phone', formatPhone(e.target.value)); setErrors(er => ({ ...er, phone: undefined })); }}
                onBlur={checkDuplicatePhone}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {errors.general && <p className="text-sm text-red-500">{errors.general}</p>}

            <Button onClick={handleFormSubmit} className="w-full" style={{ background: '#E8945A', color: '#fff' }}>
              Send verification code
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'channel') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAFCFF]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>How would you like to verify?</h2>
            <p className="text-slate-500 mt-2 text-sm">We'll send a 6-digit code to confirm your identity.</p>
          </div>
          <div className="space-y-3 mb-6">
            {[
              { id: 'email', icon: <Mail className="w-5 h-5" />, label: `Email a code to ${maskedEmail}` },
              { id: 'phone', icon: <Phone className="w-5 h-5" />, label: `Text a code to ${maskedPhone}` },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setChannel(opt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${channel === opt.id ? 'border-[#E8945A] bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <span className={channel === opt.id ? 'text-[#E8945A]' : 'text-slate-400'}>{opt.icon}</span>
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                {channel === opt.id && <CheckCircle className="w-4 h-4 text-[#E8945A] ml-auto" />}
              </button>
            ))}
          </div>
          <Button onClick={sendCode} disabled={sending} className="w-full" style={{ background: '#E8945A', color: '#fff' }}>
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send code'}
          </Button>
          <button onClick={() => setScreen('form')} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600">← Back</button>
        </div>
      </div>
    );
  }

  // OTP screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>Enter your code</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Sent to {channel === 'email' ? form.email : form.phone}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {/* 6 OTP boxes */}
          <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
            {otpDigits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={otpLocked || timer === 0}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors focus:border-[#E8945A] disabled:bg-slate-50 disabled:text-slate-300"
              />
            ))}
          </div>

          {/* Timer */}
          <p className="text-center text-sm text-slate-400 mb-4">
            {timer > 0 ? `Code expires in ${formatTime(timer)}` : <span className="text-red-500">This code has expired</span>}
          </p>

          {otpError && <p className="text-sm text-red-500 text-center mb-4">{otpError}</p>}

          <Button
            onClick={verifyOtp}
            disabled={verifying || otpDigits.join('').length < 6 || otpLocked || timer === 0}
            className="w-full mb-4"
            style={{ background: '#E8945A', color: '#fff' }}
          >
            {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify'}
          </Button>

          {/* Resend */}
          <div className="text-center">
            {resendCount >= 3 ? (
              <p className="text-xs text-slate-400">You've requested too many codes. Please wait 15 minutes before trying again.</p>
            ) : resendCooldown > 0 ? (
              <p className="text-xs text-slate-400">Resend available in {resendCooldown}s</p>
            ) : (
              <button onClick={handleResend} disabled={sending} className="text-sm text-[#E8945A] hover:underline">
                {sending ? 'Sending…' : 'Send a new code'}
              </button>
            )}
          </div>
        </div>

        <button onClick={() => setScreen('channel')} className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 text-center">← Change verification method</button>
      </div>
    </div>
  );
}