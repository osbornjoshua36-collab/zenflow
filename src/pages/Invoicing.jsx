import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Invoicing() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoicesData = await base44.entities.Invoice.list('-created_date', 50);
        const customersData = await base44.entities.Customer.list('-created_date', 100);
        
        const customersMap = {};
        customersData.forEach(c => {
          customersMap[c.id] = c;
        });

        setInvoices(invoicesData);
        setCustomers(customersMap);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  const sent = invoices.filter(i => i.status === 'Sent' || i.status === 'Viewed');
  const paid = invoices.filter(i => i.status === 'Paid');
  const overdue = invoices.filter(i => i.status === 'Overdue');

  const totalOutstanding = sent.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = paid.reduce((sum, i) => sum + i.amount, 0);

  const StatusBadge = ({ status }) => {
    const colors = {
      'Sent': 'bg-blue-100 text-blue-800',
      'Viewed': 'bg-purple-100 text-purple-800',
      'Paid': 'bg-green-100 text-green-800',
      'Overdue': 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  const InvoiceCard = ({ invoice }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              Invoice #{invoice.invoice_number}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {customers[invoice.customer_id]?.name}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Due: {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              ${invoice.amount.toFixed(2)}
            </div>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline">
            Resend
          </Button>
          <Button size="sm" variant="outline">
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              ${totalOutstanding.toFixed(0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{sent.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalPaid.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{overdue.length}</div>
            <p className="text-xs text-red-600 mt-1">
              ${overdue.reduce((sum, i) => sum + i.amount, 0).toFixed(0)} past due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="outstanding" className="w-full">
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding ({sent.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="space-y-4">
          {sent.length === 0 ? (
            <p className="text-slate-500">No outstanding invoices</p>
          ) : (
            sent.map(invoice => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paid.length === 0 ? (
            <p className="text-slate-500">No paid invoices</p>
          ) : (
            paid.map(invoice => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdue.length === 0 ? (
            <p className="text-slate-500">No overdue invoices</p>
          ) : (
            overdue.map(invoice => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Button className="w-full bg-blue-600 hover:bg-blue-700">
        Create New Invoice
      </Button>
    </div>
  );
}