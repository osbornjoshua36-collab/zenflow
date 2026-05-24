import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Archive, MessageSquare, DollarSign, CheckCircle, Clock } from 'lucide-react';
import CreateListingDialog from '@/components/CreateListingDialog';
import QuoteRespondDialog from '@/components/QuoteRespondDialog';

const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800',
  Draft: 'bg-slate-100 text-slate-700',
  Paused: 'bg-amber-100 text-amber-800',
  Archived: 'bg-red-100 text-red-700',
};

const QUOTE_COLORS = {
  Pending: 'bg-amber-100 text-amber-800',
  Quoted: 'bg-blue-100 text-blue-800',
  Accepted: 'bg-green-100 text-green-800',
  Declined: 'bg-red-100 text-red-700',
  Converted: 'bg-purple-100 text-purple-800',
  Expired: 'bg-slate-100 text-slate-600',
};

export default function SellerListings() {
  const [listings, setListings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [business, setBusiness] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [respondQuote, setRespondQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [bizList, listingsData, quotesData] = await Promise.all([
      base44.entities.Business.list('-created_date', 1),
      base44.entities.Listing.list('-created_date', 100),
      base44.entities.Quote.list('-created_date', 200),
    ]);
    setBusiness(bizList[0] || null);
    setListings(listingsData);
    setQuotes(quotesData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleArchive = async (id) => {
    await base44.entities.Listing.update(id, { status: 'Archived' });
    loadData();
  };

  const handleToggle = async (listing) => {
    await base44.entities.Listing.update(listing.id, { status: listing.status === 'Active' ? 'Paused' : 'Active' });
    loadData();
  };

  const pendingQuotes = quotes.filter(q => q.status === 'Pending');
  const activeListings = listings.filter(l => l.status === 'Active');

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Listings', value: activeListings.length, icon: Eye, color: 'text-blue-600' },
          { label: 'Pending Quotes', value: pendingQuotes.length, icon: MessageSquare, color: 'text-amber-600' },
          { label: 'Total Quotes', value: quotes.length, icon: DollarSign, color: 'text-green-600' },
          { label: 'Converted', value: quotes.filter(q => q.status === 'Converted').length, icon: CheckCircle, color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="listings">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="quotes">
              Quote Requests {pendingQuotes.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5">{pendingQuotes.length}</span>}
            </TabsTrigger>
          </TabsList>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => { setEditListing(null); setShowCreate(true); }}>
            <Plus className="w-4 h-4" /> New Listing
          </Button>
        </div>

        {/* LISTINGS TAB */}
        <TabsContent value="listings">
          {loading ? (
            <p className="text-slate-500 text-center py-12">Loading...</p>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-slate-500">No listings yet. Create your first listing to appear in the Community Hub.</p>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create Your First Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map(l => (
                <Card key={l.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4 items-start flex-1 min-w-0">
                        {l.photos?.[0] ? (
                          <img src={l.photos[0]} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-xl shrink-0">🛠️</div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 truncate">{l.title}</h3>
                            <Badge className={STATUS_COLORS[l.status] || ''}>{l.status}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{l.category} · {l.price_type === 'Free Quote' ? 'Free Quote' : `$${l.price}${l.price_type === 'Hourly' ? '/hr' : ''}`} · {l.location}</p>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-1">{l.description}</p>
                          <p className="text-xs text-slate-400 mt-1">{quotes.filter(q => q.listing_id === l.id).length} quote request(s)</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => { setEditListing(l); setShowCreate(true); }}>
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggle(l)}>
                          {l.status === 'Active' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleArchive(l.id)}>
                          <Archive className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* QUOTES TAB */}
        <TabsContent value="quotes">
          {quotes.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No quote requests yet. Activate listings to start receiving them.</p>
          ) : (
            <div className="space-y-3">
              {quotes.map(q => {
                const listing = listings.find(l => l.id === q.listing_id);
                return (
                  <Card key={q.id}>
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-slate-900">{q.buyer_name}</span>
                            <Badge className={QUOTE_COLORS[q.status] || ''}>{q.status}</Badge>
                            {listing && <span className="text-xs text-slate-500">re: {listing.title}</span>}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{q.service_description}</p>
                          <div className="flex gap-4 text-xs text-slate-400 mt-1.5">
                            <span>{q.buyer_email}</span>
                            {q.location && <span>📍 {q.location}</span>}
                            {q.budget_range && <span>💰 {q.budget_range}</span>}
                          </div>
                        </div>
                        {q.status === 'Pending' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0" onClick={() => setRespondQuote(q)}>
                            Respond
                          </Button>
                        )}
                        {q.status === 'Quoted' && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-slate-900">${q.seller_price}</p>
                            <p className="text-xs text-slate-400">Awaiting buyer</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateListingDialog
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditListing(null); }}
        onCreated={loadData}
        businessId={business?.id || 'default'}
        existing={editListing}
      />

      {respondQuote && (
        <QuoteRespondDialog
          open={!!respondQuote}
          onClose={() => setRespondQuote(null)}
          onSaved={loadData}
          quote={respondQuote}
        />
      )}
    </div>
  );
}