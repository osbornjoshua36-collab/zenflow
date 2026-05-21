import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign, Phone, Plus } from 'lucide-react';
import PostServiceRequestDialog from '@/components/PostServiceRequestDialog';

const URGENCY_COLORS = {
  'ASAP': 'bg-red-100 text-red-700',
  'This Week': 'bg-amber-100 text-amber-700',
  'This Month': 'bg-blue-100 text-blue-700',
  'Flexible': 'bg-green-100 text-green-700',
};

export default function ServiceRequestBoard({ requests, onRefresh }) {
  const [showDialog, setShowDialog] = useState(false);
  const [filter, setFilter] = useState('All');

  const INDUSTRIES = ['All', 'HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
  const filtered = filter === 'All' ? requests : requests.filter(r => r.industry === filter);
  const open = filtered.filter(r => r.status === 'Open');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map(i => (
            <button
              key={i}
              onClick={() => setFilter(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === i ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
            >
              {i}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Post a Request
        </Button>
      </div>

      {open.length === 0 ? (
        <div className="text-center text-slate-500 py-16 bg-white rounded-xl border">
          <p className="font-medium">No open requests right now.</p>
          <p className="text-sm mt-1">Be the first to post what you need!</p>
          <Button className="mt-4" onClick={() => setShowDialog(true)}>Post a Request</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {open.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug flex-1">{r.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${URGENCY_COLORS[r.urgency] || 'bg-slate-100 text-slate-600'}`}>
                    {r.urgency || 'Flexible'}
                  </span>
                </div>
                {r.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{r.description}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{r.industry}</Badge>
                  {r.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />{r.location}
                    </span>
                  )}
                  {r.budget && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <DollarSign className="w-3 h-3" />{r.budget}
                    </span>
                  )}
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{r.contact_name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{r.contact_phone}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.created_date).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PostServiceRequestDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreated={onRefresh}
      />
    </div>
  );
}