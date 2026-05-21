import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Globe, ClipboardList, CalendarCheck } from 'lucide-react';
import BusinessCard from '@/components/BusinessCard';
import ServiceRequestBoard from '@/components/ServiceRequestBoard';
import BusinessAvailabilityView from '@/components/BusinessAvailabilityView';

const INDUSTRIES = ['All', 'HVAC', 'Plumbing', 'Electrical', 'Salon', 'Real Estate', 'Cleaning', 'Landscaping', 'Other'];

export default function CommunityHub() {
  const [businesses, setBusinesses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [biz, jobData, reqs] = await Promise.all([
      base44.entities.Business.list('-created_date', 100),
      base44.entities.Job.list('-scheduled_date', 500),
      base44.entities.ServiceRequest.list('-created_date', 200),
    ]);
    setBusinesses(biz);
    setJobs(jobData);
    setRequests(reqs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

  const filteredBiz = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = industry === 'All' || b.industry === industry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="w-7 h-7" />
          <h1 className="text-3xl font-bold">Sphere — Community Hub</h1>
        </div>
        <p className="text-blue-100 text-lg max-w-xl mx-auto">
          Find trusted local service businesses, post what you need, and book directly.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="directory">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="directory" className="gap-2"><Globe className="w-4 h-4" /> Business Directory</TabsTrigger>
            <TabsTrigger value="requests" className="gap-2"><ClipboardList className="w-4 h-4" /> Service Requests</TabsTrigger>
            <TabsTrigger value="book" className="gap-2"><CalendarCheck className="w-4 h-4" /> Book a Business</TabsTrigger>
          </TabsList>

          {/* Tab 1: Directory */}
          <TabsContent value="directory">
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input className="pl-9" placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Industry" /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="text-center text-slate-500 py-16">Loading...</div>
            ) : filteredBiz.length === 0 ? (
              <div className="text-center text-slate-500 py-16">No businesses found.</div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">{filteredBiz.length} business{filteredBiz.length !== 1 ? 'es' : ''} listed</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredBiz.map(b => (
                    <BusinessCard key={b.id} business={b} availability={getAvailability(b.id)} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab 2: Service Requests */}
          <TabsContent value="requests">
            {loading ? (
              <div className="text-center text-slate-500 py-16">Loading...</div>
            ) : (
              <ServiceRequestBoard requests={requests} onRefresh={loadData} />
            )}
          </TabsContent>

          {/* Tab 3: Book a Business */}
          <TabsContent value="book">
            {loading ? (
              <div className="text-center text-slate-500 py-16">Loading...</div>
            ) : (
              <div>
                {!selectedBusiness ? (
                  <>
                    <p className="text-sm text-slate-600 mb-4">Select a business to view their availability and book a time slot.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {businesses.map(b => (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBusiness(b)}
                          className="cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                          <BusinessCard business={b} availability={getAvailability(b.id)} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <button
                      onClick={() => setSelectedBusiness(null)}
                      className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1"
                    >
                      ← Back to all businesses
                    </button>
                    <BusinessAvailabilityView business={selectedBusiness} jobs={jobs} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}