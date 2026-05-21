import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];
const URGENCIES = ['ASAP', 'This Week', 'This Month', 'Flexible'];

export default function PostServiceRequestDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', industry: '', location: '', budget: '',
    urgency: 'Flexible', contact_name: '', contact_phone: '', contact_email: '', status: 'Open',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.industry || !form.contact_name || !form.contact_phone) return;
    setLoading(true);
    await base44.entities.ServiceRequest.create(form);
    setLoading(false);
    setForm({ title: '', description: '', industry: '', location: '', budget: '', urgency: 'Flexible', contact_name: '', contact_phone: '', contact_email: '', status: 'Open' });
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a Service Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>What do you need?*</Label>
            <Input placeholder="e.g. AC unit not cooling, need repair" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <Label>More details</Label>
            <Input placeholder="Optional description" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Service Type*</Label>
              <Select value={form.industry} onValueChange={v => set('industry', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={v => set('urgency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Input placeholder="City or area" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div>
              <Label>Budget</Label>
              <Input placeholder="e.g. $200–$500" value={form.budget} onChange={e => set('budget', e.target.value)} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Your Contact Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name*</Label>
                <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              </div>
              <div>
                <Label>Phone*</Label>
                <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Email</Label>
              <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Posting...' : 'Post Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}