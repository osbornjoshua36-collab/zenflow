import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, HelpCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const BUYER_FAQS = [
  {
    q: 'How do I request a quote from a seller?',
    a: "Browse the Community Hub, click on a listing you're interested in, and click 'Request a Quote'. Fill in the details and the seller will respond within their stated response time.",
  },
  {
    q: 'How do I know a seller is trustworthy?',
    a: 'Look for sellers with Verified badges, high star ratings, and multiple reviews from past buyers. All reviews on this platform are from verified transactions.',
  },
  {
    q: "What if I'm unhappy with the service I received?",
    a: 'You can raise a dispute from your buyer dashboard within 30 days of job completion. Our team reviews all disputes and responds within 72 hours.',
  },
  {
    q: 'How do I cancel a booking?',
    a: "Contact the seller directly through the messaging system as early as possible. The seller's cancellation policy is shown on their profile.",
  },
];

const SELLER_FAQS = [
  {
    q: 'How do I create a service listing?',
    a: "Go to Seller Listings from your dashboard and click 'Create new listing'. Fill in your service details, set your pricing, and publish.",
  },
  {
    q: 'How do advertising tiers work?',
    a: 'Choose from Banner, Featured, or Spotlight tiers on the Ads page. Each tier gives your listings more visibility in the Community Hub. Billing is monthly and you can cancel at any time from the Billing page.',
  },
  {
    q: 'How do I respond to a quote request?',
    a: "Quote requests appear on your Seller Listings page. Click on the request to view the buyer's details and respond with your price and availability.",
  },
  {
    q: 'How do I get verified on the platform?',
    a: 'Complete your business profile fully and ensure your phone number is verified. Our team reviews verification requests and will update your status.',
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-800 text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

function FAQSection({ heading, items, search }) {
  const filtered = items.filter(
    f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );
  if (filtered.length === 0) return null;
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{heading}</h2>
      <div className="bg-white rounded-xl border overflow-hidden">
        {filtered.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
      </div>
    </div>
  );
}

const CATEGORIES = ['General question', 'Billing issue', 'Report a problem', 'Technical issue', 'Verification question'];

export default function Support() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', category: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.message) { setError('Email and message are required.'); return; }
    if (form.message.trim().length < 30) { setError('Message must be at least 30 characters.'); return; }
    setError('');
    setSubmitting(true);
    await base44.entities.SupportTicket.create({
      name: form.name,
      email: form.email,
      category: form.category || 'General question',
      message: form.message,
      status: 'open',
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  const noResults = search &&
    BUYER_FAQS.every(f => !f.q.toLowerCase().includes(search.toLowerCase()) && !f.a.toLowerCase().includes(search.toLowerCase())) &&
    SELLER_FAQS.every(f => !f.q.toLowerCase().includes(search.toLowerCase()) && !f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="text-white px-6 py-12 text-center" style={{ background: 'linear-gradient(135deg, #1E3245 0%, #2E4A65 100%)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <HelpCircle className="w-7 h-7" />
          <h1 className="text-3xl font-bold">Help &amp; Support</h1>
        </div>
        <p className="text-blue-100 text-lg mb-6">Find answers or get in touch with our team.</p>
        <div className="max-w-md mx-auto">
          <input
            className="w-full px-5 py-3 rounded-xl text-slate-900 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search for help..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {noResults ? (
          <div className="text-center text-slate-500 py-8">No results found for "{search}".</div>
        ) : (
          <>
            <FAQSection heading="For buyers" items={BUYER_FAQS} search={search} />
            <FAQSection heading="For sellers" items={SELLER_FAQS} search={search} />
          </>
        )}

        {/* Contact form */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Still need help?</h2>
          <p className="text-sm text-slate-500 mb-5">Send us a message and we'll reply within 1 business day.</p>

          {submitted ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                Thanks — we've received your message and will reply to <strong>{form.email}</strong> within 1 business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Name</label>
                  <Input placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Email *</label>
                  <Input type="email" placeholder="you@example.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Category</label>
                <select
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">Select a category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Message * <span className="text-slate-400 font-normal">(min. 30 characters)</span>
                </label>
                <textarea
                  className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-transparent text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Describe your issue or question..."
                  required
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />
                <p className="text-xs text-slate-400 mt-1">{form.message.trim().length} / 30 min characters</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} style={{ background: '#1E3245', color: '#fff' }}>
                {submitting ? 'Sending...' : 'Send message'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}