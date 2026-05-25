import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, Phone, MessageSquare } from 'lucide-react';

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
const TIMEZONES = [
  { id: 'America/New_York',    label: 'Eastern Time (ET)'  },
  { id: 'America/Chicago',     label: 'Central Time (CT)'  },
  { id: 'America/Denver',      label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)'  },
  { id: 'America/Phoenix',     label: 'Arizona (MST)'      },
  { id: 'Pacific/Honolulu',    label: 'Hawaii (HST)'       },
  { id: 'America/Anchorage',   label: 'Alaska (AKST)'      },
];

// Step 1: Business info. Step 2: Phone verify.
export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', industry: '', timezone: 'America/New_York', owner_email: '' });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [existingBiz, setExistingBiz] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      set('owner_email', me.email);
      const existing = await base44.entities.Business.filter({ owner_email: me.email });
      if (existing.length > 0) {
        const biz = existing[0];
        setExistingBiz(biz);
        setForm({ name: biz.name || '', industry: biz.industry || '', timezone: biz.timezone || 'America/New_York', owner_email: me.email });
        if (biz.phone && biz.phone_verified) {
          setPhone(biz.phone);
          setPhoneVerified(true);
        }
      }
    })();
  }, []);

  // Normalize to E.164
  const normalizePhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  };

  const handleSendOtp = async () => {
    setOtpError('');
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, '').length < 10) {
      setOtpError('Please enter a valid US phone number.');
      return;
    }
    setSendingOtp(true);
    const res = await base44.functions.invoke('phoneOtp', { action: 'send', phone: normalized });
    setSendingOtp(false);
    if (res.data?.success) {
      setOtpSent(true);
    } else {
      setOtpError(res.data?.error || 'Failed to send code. Try again.');
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    setVerifyingOtp(true);
    const normalized = normalizePhone(phone);
    const res = await base44.functions.invoke('phoneOtp', { action: 'verify', phone: normalized, code: otp });
    setVerifyingOtp(false);
    if (res.data?.valid) {
      setPhoneVerified(true);
    } else {
      setOtpError(res.data?.error || 'Incorrect code. Please try again.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const normalized = normalizePhone(phone);
    const payload = {
      name: form.name,
      industry: form.industry,
      timezone: form.timezone,
      owner_email: form.owner_email,
      phone: normalized,
      phone_verified: true,
      status: 'Active',
      ai_tone: 'Professional'
    };
    if (existingBiz) {
      await base44.entities.Business.update(existingBiz.id, payload);
    } else {
      await base44.entities.Business.create(payload);
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => navigate('/seller/listings'), 1800);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFCFF]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h2>
          <p className="text-slate-500">Taking you to your listings dashboard…</p>
        </div>
      </div>
    );
  }

  const step1Complete = form.name.trim() && form.industry && form.timezone;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-fraunces)' }}>
            Create Your Seller Account
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Quick setup — you'll be live in under a minute.</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mt-5">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= s ? 'bg-[#E8945A] text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
                {s < 2 && <div className={`w-10 h-0.5 transition-colors ${step > s ? 'bg-[#E8945A]' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

          {/* STEP 1: Business info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-700">Business Details</h2>

              <div>
                <Label className="text-sm font-medium text-slate-700">Business Name *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Smith's Plumbing Co."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Industry *</Label>
                <Select value={form.industry} onValueChange={v => set('industry', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select your industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Your Timezone *</Label>
                <Select value={form.timezone} onValueChange={v => set('timezone', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!step1Complete}
                className="w-full mt-2"
                style={{ background: '#E8945A', color: '#fff' }}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* STEP 2: Phone verification */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#E8945A]" />
                <h2 className="text-lg font-semibold text-slate-700">Verify Your Phone</h2>
              </div>
              <p className="text-sm text-slate-500">We'll send a 6-digit code to confirm you're a real person.</p>

              {!phoneVerified ? (
                <>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Mobile Phone Number *</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setOtpSent(false); setOtp(''); setOtpError(''); }}
                        disabled={otpSent}
                      />
                      <Button
                        variant="outline"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !phone.trim()}
                        className="shrink-0"
                      >
                        {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : otpSent ? 'Resend' : 'Send Code'}
                      </Button>
                    </div>
                  </div>

                  {otpSent && (
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Enter 6-digit Code</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          value={otp}
                          onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                          className="tracking-widest text-center text-lg font-semibold"
                        />
                        <Button
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp || otp.length < 6}
                          className="shrink-0"
                          style={{ background: '#E8945A', color: '#fff' }}
                        >
                          {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Code sent via SMS. Valid for 10 minutes.
                      </p>
                    </div>
                  )}

                  {otpError && <p className="text-sm text-red-500">{otpError}</p>}
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Phone verified!</p>
                    <p className="text-xs text-green-600">{normalizePhone(phone)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                <Button
                  onClick={handleSave}
                  disabled={!phoneVerified || saving}
                  className="flex-1"
                  style={{ background: '#E8945A', color: '#fff' }}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Finish Setup <CheckCircle className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can update your profile anytime from <span className="font-medium">Seller Settings</span>.
        </p>
      </div>
    </div>
  );
}