import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users } from 'lucide-react';
import { format } from 'date-fns';

export default function Clients() {
  const [business, setBusiness] = useState(null);
  const [recentBuyers, setRecentBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      const biz = bizList[0] || null;
      setBusiness(biz);
      if (biz) {
        const completedJobs = await base44.entities.Job.filter({ business_id: biz.id, status: 'Completed' }, '-scheduled_date', 50);
        // Get unique customer IDs from most recent jobs
        const seen = new Set();
        const topJobs = completedJobs.filter(j => {
          if (seen.has(j.customer_id)) return false;
          seen.add(j.customer_id);
          return true;
        }).slice(0, 5);

        const buyerDetails = await Promise.all(
          topJobs.map(async (j) => {
            const custs = await base44.entities.Customer.filter({ id: j.customer_id });
            return { job: j, customer: custs[0] || null };
          })
        );
        setRecentBuyers(buyerDetails.filter(b => b.customer));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 flex items-start gap-4">
        <Users className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Client management coming soon</p>
          <p className="text-sm text-slate-500 mt-1">Your full client history, notes, and re-booking tools are on the way.</p>
        </div>
      </div>

      {recentBuyers.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-slate-800">Recent Clients</h2>
            <p className="text-xs text-slate-500 mt-0.5">Clients from your 5 most recent completed jobs</p>
          </div>
          <ul className="divide-y">
            {recentBuyers.map(({ job, customer }) => (
              <li key={job.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{customer.name}</p>
                  <p className="text-sm text-slate-500">{job.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Last job</p>
                  <p className="text-sm text-slate-600">
                    {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}