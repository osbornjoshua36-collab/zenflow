import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import InvoiceList from '@/components/InvoiceList';
import InvoiceCreate from '@/components/InvoiceCreate';
import InvoiceDetail from '@/components/InvoiceDetail';

export default function Invoicing() {
  const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [business, setBusiness] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [invData, custData, bizList] = await Promise.all([
      base44.entities.Invoice.list('-created_date', 200),
      base44.entities.Customer.list('-created_date', 200),
      base44.entities.Business.list('-created_date', 1),
    ]);
    setBusiness(bizList[0] || null);
    setCustomers(custData);
    // filter to this business
    const biz = bizList[0];
    setInvoices(biz ? invData.filter(i => i.business_id === biz.id) : invData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleView = (inv) => { setSelectedInvoice(inv); setView('detail'); };
  const handleBack = () => { setSelectedInvoice(null); setView('list'); };
  const handleCreated = () => { loadData(); setView('list'); };
  const handleUpdated = async () => { await loadData(); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  if (view === 'create') return (
    <InvoiceCreate
      business={business}
      customers={customers}
      invoiceCount={invoices.length}
      onCreated={handleCreated}
      onCancel={handleBack}
    />
  );

  if (view === 'detail' && selectedInvoice) return (
    <InvoiceDetail
      invoice={selectedInvoice}
      customers={customers}
      onBack={handleBack}
      onUpdated={handleUpdated}
    />
  );

  return (
    <InvoiceList
      invoices={invoices}
      customers={customers}
      onView={handleView}
      onCreate={() => setView('create')}
      onUpdated={handleUpdated}
    />
  );
}