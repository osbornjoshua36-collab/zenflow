import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ImportContactsCard({ businessId }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setImporting(true);
    setResult(null);
    setError(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                address: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
      },
    });

    if (extracted.status !== 'success' || !extracted.output?.contacts?.length) {
      setError('Could not read contacts from this file. Make sure it has columns for name, phone, and/or email.');
      setImporting(false);
      return;
    }

    const records = extracted.output.contacts.map(c => ({
      business_id: businessId,
      name: c.name || 'Unknown',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
    }));

    await base44.entities.Customer.bulkCreate(records);
    setResult(records.length);
    setImporting(false);
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          Import Customer Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Bring your existing customers into the system so you can manage jobs, send messages, and track history — all in one place.
        </p>

        {/* CSV Upload */}
        <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
          <label className="cursor-pointer flex flex-col items-center gap-2 text-center">
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Upload a CSV or Excel file</span>
            <span className="text-xs text-slate-400">Include columns for name, phone, email, or address</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSV} disabled={importing || !businessId} />
            <Button size="sm" variant="outline" className="mt-1 pointer-events-none">
              {importing ? 'Importing...' : 'Choose File'}
            </Button>
          </label>
        </div>

        {/* Template hint */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Export contacts from Google Contacts, QuickBooks, or your phone as a CSV — then upload it here. Any format with a "Name" column will work.
          </p>
        </div>

        {/* Manual entry hint */}
        <p className="text-xs text-slate-400 text-center">
          Prefer to add contacts one at a time? Head to the <strong>Customers</strong> section after setup.
        </p>

        {result && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Successfully imported <strong>{result}</strong> contact{result !== 1 ? 's' : ''}.
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}