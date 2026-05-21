import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

export default function Reputation() {
  const [reviews, setReviews] = useState([]);
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reviewsData = await base44.entities.Review.list('-created_date', 50);
        const customersData = await base44.entities.Customer.list('-created_date', 100);
        
        const customersMap = {};
        customersData.forEach(c => {
          customersMap[c.id] = c;
        });

        setReviews(reviewsData);
        setCustomers(customersMap);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  const pending = reviews.filter(r => r.status === 'Pending');
  const responded = reviews.filter(r => r.status === 'Responded');
  const ignored = reviews.filter(r => r.status === 'Ignored');

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ReviewCard = ({ review, showDraft = false }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <Badge variant="outline">{review.platform}</Badge>
        </div>
        <h3 className="font-semibold text-slate-900">
          {customers[review.customer_id]?.name}
        </h3>
        <p className="text-sm text-slate-600 mt-2">{review.text}</p>
        
        {showDraft && review.ai_response_draft && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold mb-1">AI Response Draft:</p>
            <p className="text-sm text-blue-900">{review.ai_response_draft}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {showDraft && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Send
              </Button>
              <Button size="sm" variant="outline">
                Edit
              </Button>
            </>
          )}
          {!showDraft && (
            <Button size="sm" variant="outline">
              View Full
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{avgRating}</span>
              <div className="flex">
                {Array.from({ length: Math.round(avgRating) }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reviews.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{pending.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">
          Pending Responses ({pending.length})
        </h3>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-slate-500">All reviews have been responded to</p>
          ) : (
            pending.map(review => (
              <ReviewCard key={review.id} review={review} showDraft={true} />
            ))
          )}
        </div>
      </div>

      {/* Responded Reviews */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">
          Responded ({responded.length})
        </h3>
        <div className="space-y-4">
          {responded.length === 0 ? (
            <p className="text-slate-500">No responded reviews</p>
          ) : (
            responded.map(review => (
              <ReviewCard key={review.id} review={review} showDraft={false} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}