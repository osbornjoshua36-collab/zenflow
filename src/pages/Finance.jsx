import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt } from 'lucide-react';
import InvoiceCreate from '@/components/InvoiceCreate';
import InvoiceList from '@/components/InvoiceList';
import InvoiceDetail from '@/components/InvoiceDetail';

export default function Finance() {
  const [business, setBusiness] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async (biz) => {
    const [invs, custs] = await Promise.all([
      base44.entities.Invoice.filter({ business_id: biz.id }, '-created_date', 200),
      base44.entities.Customer.filter({ business_id: biz.id }, 'name', 200),
    ]);
    setInvoices(invs);
    setCustomers(custs);
  };

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) { setLoading(false); return; }
      const bizList = await base44.entities.Business.filter({ owner_email: me.email });
      const biz = bizList[0] || null;
      setBusiness(biz);
      if (biz) await loadData(biz);
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

  if (showCreate) return (
    <InvoiceCreate businessId={business.id} onClose={async () => { setShowCreate(false); await loadData(business); }} />
  );

  if (selectedInvoice) return (
    <InvoiceDetail invoice={selectedInvoice} customers={customers} onClose={() => setSelectedInvoice(null)} onUpdated={async () => { await loadData(business); setSelectedInvoice(null); }} />
  );

  return (
    <InvoiceList
      invoices={invoices}
      customers={customers}
      onCreate={() => setShowCreate(true)}
      onView={(inv) => setSelectedInvoice(inv)}
      onUpdated={() => loadData(business)}
    />
  );
}