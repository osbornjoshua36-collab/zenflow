import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BusinessCard from '@/components/BusinessCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Globe } from 'lucide-react';

const INDUSTRIES = ['All', 'HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];

export default function CommunityHub() {
  const [businesses, setBusinesses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [biz, jobData] = await Promise.all([
        base44.entities.Business.list('-created_date', 100),
        base44.entities.Job.list('-scheduled_date', 500),
      ]);
      setBusinesses(biz);
      setJobs(jobData);
      setLoading(false);
    };
    load();
  }, []);

  // Calculate busyness: jobs scheduled in the next 7 days per business
  const getAvailability = (businessId) => {
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = jobs.filter(j =>
      j.business_id === businessId &&
      j.status === 'Scheduled' &&
      new Date(j.scheduled_date) >= now &&
      new Date(j.scheduled_date) <= weekOut
    );
    if (upcoming.length === 0) return { label: 'Available Now', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', count: 0 };
    if (upcoming.length <= 3) return { label: 'Some Availability', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', count: upcoming.length };
    return { label: 'Very Busy', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', count: upcoming.length };
  };

  const filtered = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = industry === 'All' || b.industry === industry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-14 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="w-7 h-7" />
          <h1 className="text-3xl font-bold">ConnectOS Community Hub</h1>
        </div>
        <p className="text-blue-100 text-lg max-w-xl mx-auto">
          Find trusted local service businesses and see who's available to help right now.
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search businesses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-slate-500 py-16">Loading businesses...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-16">No businesses found.</div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{filtered.length} business{filtered.length !== 1 ? 'es' : ''} listed</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(b => (
                <BusinessCard key={b.id} business={b} availability={getAvailability(b.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}