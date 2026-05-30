import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvoiceCreate from '@/components/InvoiceCreate';
import InvoiceList from '@/components/InvoiceList';

export default function Finance() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      setBusiness(bizList[0] || null);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (!business) return (
    <div className="text-center py-24 text-slate-500">
      <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300" />
      <p className="text-lg font-medium text-slate-600">Finance tools coming soon</p>
      <p className="text-sm mt-1">Invoices, expenses, and tax reporting — all in one place.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mt-1">Manage invoices and track payments.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Invoice
        </Button>
      </div>

      {showCreate
        ? <InvoiceCreate businessId={business.id} onClose={() => setShowCreate(false)} />
        : <InvoiceList businessId={business.id} />
      }
    </div>
  );
}