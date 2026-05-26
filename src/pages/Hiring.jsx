import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Users, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const POSTING_STATUS_COLORS = {
  Active: 'bg-green-100 text-green-700',
  Draft: 'bg-yellow-100 text-yellow-700',
  Paused: 'bg-orange-100 text-orange-700',
  Closed: 'bg-slate-100 text-slate-500',
};

const APPLICANT_STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-600',
  Screening: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-indigo-100 text-indigo-700',
  'Interview Scheduled': 'bg-purple-100 text-purple-700',
  Hired: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
};

const APPLICANT_STATUSES = ['New', 'Screening', 'Qualified', 'Interview Scheduled', 'Hired', 'Rejected'];

const empty = { title: '', description: '', requirements: '', status: 'Draft' };

export default function Hiring() {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'applicants'
  const [business, setBusiness] = useState(null);
  const [postings, setPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [interviewDates, setInterviewDates] = useState({});
  const [loading, setLoading] = useState(true);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { setLoading(false); return; }
        const biz = await base44.entities.Business.filter({ owner_email: me.email });
        if (biz[0]) {
          setBusiness(biz[0]);
          const data = await base44.entities.JobPosting.filter({ business_id: biz[0].id }, '-created_date', 100);
          setPostings(data);
        }
      } catch {
        // not authenticated
      }
      setLoading(false);
    })();
  }, []);

  const loadApplicants = async (posting) => {
    const data = await base44.entities.Applicant.filter({ job_posting_id: posting.id }, '-created_date', 200);
    setApplicants(data);
    setSelectedPosting(posting);
    setView('applicants');
  };

  const handleSave = async () => {
    if (!form.title) return;
    const data = { ...form, business_id: business.id };
    if (editingId) {
      const updated = await base44.entities.JobPosting.update(editingId, data);
      setPostings(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
    } else {
      const created = await base44.entities.JobPosting.create(data);
      setPostings(prev => [created, ...prev]);
    }
    setForm(empty);
    setEditingId(null);
    setView('list');
  };

  const handleClose = async (id) => {
    await base44.entities.JobPosting.update(id, { status: 'Closed' });
    setPostings(prev => prev.map(p => p.id === id ? { ...p, status: 'Closed' } : p));
  };

  const handleEdit = (posting) => {
    setForm({ title: posting.title, description: posting.description || '', requirements: posting.requirements || '', status: posting.status });
    setEditingId(posting.id);
    setView('form');
  };

  const handleApplicantStatus = async (id, status) => {
    await base44.entities.Applicant.update(id, { status });
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleSchedule = async (id) => {
    const date = interviewDates[id];
    if (!date) return;
    await base44.entities.Applicant.update(id, { interview_date: new Date(date).toISOString(), status: 'Interview Scheduled' });
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, interview_date: new Date(date).toISOString(), status: 'Interview Scheduled' } : a));
    setInterviewDates(prev => ({ ...prev, [id]: '' }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (!business) return (
    <div className="text-center py-16 text-slate-500">
      <p>No business profile found. Please set up your business in Settings first.</p>
    </div>
  );

  const plan = business.subscription_plan || 'starter';
  if (plan !== 'business') return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Hiring requires the Business plan</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">Upgrade to Business to unlock hiring, applicant tracking, AI screening, and interview scheduling.</p>
      <Link to="/seller/subscription" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors">
        View Plans &amp; Upgrade
      </Link>
    </div>
  );

  // ─── VIEW 2: Form ───────────────────────────────────────────────────────────
  if (view === 'form') return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => { setView('list'); setForm(empty); setEditingId(null); }}
          className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to postings
        </button>
        <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Job Posting' : 'Post a New Job'}</h2>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <Label>Job Title *</Label>
          <Input placeholder="e.g. HVAC Technician" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Describe the role and responsibilities..."
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div>
          <Label>Requirements</Label>
          <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Licenses, certifications, years of experience..."
            value={form.requirements} onChange={e => set('requirements', e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft — Save for later</SelectItem>
              <SelectItem value="Active">Active — Accepting applicants</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={!form.title} className="bg-navy text-white hover:bg-navy-light">
          {editingId ? 'Save Changes' : 'Publish Posting'}
        </Button>
        <Button variant="outline" onClick={() => { setView('list'); setForm(empty); setEditingId(null); }}>Cancel</Button>
      </div>
    </div>
  );

  // ─── VIEW 3: Applicants ─────────────────────────────────────────────────────
  if (view === 'applicants') {
    const screening = applicants.filter(a => a.status === 'Screening').length;
    const interviewing = applicants.filter(a => a.status === 'Interview Scheduled').length;

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to postings
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selectedPosting?.title}</h2>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
          AI assessments are generated automatically when applicants apply.
        </div>

        <div className="flex gap-4 text-sm text-slate-600">
          <span className="font-medium">{applicants.length} total</span>
          <span className="text-blue-600">{screening} in screening</span>
          <span className="text-purple-600">{interviewing} interviewing</span>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          {applicants.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No applicants yet for this posting.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">AI Assessment</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Interview Date</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map(a => (
                  <>
                    <tr key={a.id} className="border-b hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === a.id ? null : a.id)}>
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-1">
                        {a.name}
                        {expandedRow === a.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Select value={a.status} onValueChange={v => handleApplicantStatus(a.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICANT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px]">
                        {a.ai_assessment ? a.ai_assessment.slice(0, 100) + (a.ai_assessment.length > 100 ? '…' : '') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {a.interview_date ? new Date(a.interview_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Input type="date" className="h-7 text-xs w-32"
                            value={interviewDates[a.id] || ''}
                            onChange={e => setInterviewDates(prev => ({ ...prev, [a.id]: e.target.value }))} />
                          <Button size="sm" className="h-7 text-xs px-2"
                            disabled={!interviewDates[a.id]}
                            onClick={() => handleSchedule(a.id)}>
                            Schedule
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === a.id && (
                      <tr key={`${a.id}-expanded`} className="bg-slate-50 border-b">
                        <td colSpan={5} className="px-6 py-4">
                          <p className="text-xs font-semibold text-slate-500 mb-1">Full AI Assessment</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.ai_assessment || 'No assessment available.'}</p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ─── VIEW 1: Postings List ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hiring</h2>
          <p className="text-sm text-slate-500">{postings.filter(p => p.status === 'Active').length} active postings</p>
        </div>
        <Button onClick={() => { setForm(empty); setEditingId(null); setView('form'); }}
          className="gap-2 bg-navy text-white hover:bg-navy-light">
          <Plus className="w-4 h-4" /> Post new job
        </Button>
      </div>

      {postings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No job postings yet.</p>
          <p className="text-sm mt-1">Click "Post new job" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {postings.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POSTING_STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-500'}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {p.applicant_count ?? 0} applicants
                  {p.posted_date ? ` · Posted ${new Date(p.posted_date).toLocaleDateString()}` : ` · Created ${new Date(p.created_date).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => loadApplicants(p)}>
                  View applicants
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                  Edit
                </Button>
                {p.status !== 'Closed' && (
                  <Button size="sm" variant="outline" className="text-slate-500"
                    onClick={() => handleClose(p.id)}>
                    Close posting
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}