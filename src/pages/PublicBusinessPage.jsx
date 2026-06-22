import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import BusinessPagePreview from '@/components/businesspage/BusinessPagePreview';

export default function PublicBusinessPage() {
  const { handle } = useParams();
  const [page, setPage] = useState(null);
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const pages = await base44.entities.BusinessPage.filter({ handle });
      const pg = pages.find(p => p.status === 'published');
      if (!pg) { setNotFound(true); setLoading(false); return; }
      setPage(pg);

      const [bizList, reviewsList] = await Promise.all([
        base44.entities.Business.filter({ id: pg.business_id }),
        base44.entities.Review.filter({ business_id: pg.business_id }),
      ]);
      setBusiness(bizList[0] || null);
      setReviews(reviewsList.filter(r => r.verified));
      setLoading(false);
    })();
  }, [handle]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <p className="text-6xl mb-4">🔍</p>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
      <p className="text-slate-500">This business page isn't published or doesn't exist.</p>
    </div>
  );

  return <BusinessPagePreview page={page} business={business} reviews={reviews} isPreview={false} />;
}