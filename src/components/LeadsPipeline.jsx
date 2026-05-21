import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, CheckCircle, Calendar } from 'lucide-react';

const STAGES = [
  { key: 'new', label: 'New Inquiry', icon: MessageSquare, color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  { key: 'draft', label: 'AI Draft Ready', icon: Clock, color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  { key: 'responded', label: 'Responded', icon: CheckCircle, color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
  { key: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
];

export default function LeadsPipeline() {
  const [pipeline, setPipeline] = useState({ new: [], draft: [], responded: [], scheduled: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [messages, customers, jobs] = await Promise.all([
        base44.entities.Message.list('-created_date', 100),
        base44.entities.Customer.list('-created_date', 100),
        base44.entities.Job.filter({ status: 'Scheduled' }, '-created_date', 50),
      ]);

      const customerMap = {};
      customers.forEach(c => { customerMap[c.id] = c; });

      // Group by conversation to deduplicate
      const convMap = {};
      messages.forEach(msg => {
        const cid = msg.conversation_id || msg.id;
        if (!convMap[cid]) convMap[cid] = { messages: [], customer: customerMap[msg.customer_id] };
        convMap[cid].messages.push(msg);
      });

      const scheduledCustomerIds = new Set(jobs.map(j => j.customer_id));

      const stages = { new: [], draft: [], responded: [], scheduled: [] };

      Object.entries(convMap).forEach(([cid, thread]) => {
        const msgs = thread.messages;
        const customer = thread.customer;
        const hasOutbound = msgs.some(m => m.direction === 'Outbound');
        const hasDraft = msgs.some(m => m.ai_drafted && !m.approved_by);
        const inbound = msgs.find(m => m.direction === 'Inbound');
        if (!inbound) return;

        const lead = {
          id: cid,
          customerName: customer?.name || inbound.sender || 'Unknown',
          preview: inbound.content,
          date: inbound.created_date,
          channel: inbound.channel,
          unread: msgs.some(m => !m.is_read && m.direction === 'Inbound'),
          customerId: inbound.customer_id,
        };

        if (scheduledCustomerIds.has(lead.customerId)) {
          stages.scheduled.push(lead);
        } else if (hasOutbound) {
          stages.responded.push(lead);
        } else if (hasDraft) {
          stages.draft.push(lead);
        } else {
          stages.new.push(lead);
        }
      });

      setPipeline(stages);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-sm text-slate-500 py-4">Loading pipeline...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">Leads Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGES.map(stage => {
            const Icon = stage.icon;
            const leads = pipeline[stage.key];
            return (
              <div key={stage.key} className={`rounded-lg border p-3 ${stage.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                    {leads.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {leads.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No leads</p>
                  )}
                  {leads.map(lead => (
                    <div key={lead.id} className="bg-white rounded-md p-2 shadow-sm border border-white/80">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{lead.customerName}</p>
                        {lead.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lead.preview}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{lead.channel}</Badge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(lead.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}