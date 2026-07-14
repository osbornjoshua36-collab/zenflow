import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  Scheduled:    { bg: '#E4F6FB', text: '#1A5E70' },
  'In Progress':{ bg: '#FFF8E4', text: '#7A5A10' },
  Completed:    { bg: '#E4F5EC', text: '#276048' },
  Cancelled:    { bg: '#FDECEA', text: '#7A2E2E' },
  'No-Show':    { bg: '#EEF3F8', text: '#4A6580' },
};

export default function PostJob() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('job_id');

  const [job, setJob] = useState(null);
  const [business, setBusiness] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [marking, setMarking] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided in the URL.');
      setLoading(false);
      return;
    }
    loadData();
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);
    const jobData = await base44.entities.Job.get(jobId);
    if (!jobData) {
      setError('Job not found.');
      setLoading(false);
      return;
    }
    setJob(jobData);

    const [bizResults, reviewResults] = await Promise.all([
      base44.entities.Business.filter({ id: jobData.business_id }),
      base44.entities.Review.filter({ job_id: jobId }),
    ]);

    if (bizResults && bizResults.length > 0) setBusiness(bizResults[0]);
    if (reviewResults && reviewResults.length > 0) setExistingReview(reviewResults[0]);

    setLoading(false);
  };

  const handleMarkComplete = async () => {
    setMarking(true);
    await base44.entities.Job.update(jobId, {
      status: 'Completed',
      completed_at: new Date().toISOString(),
    });
    await base44.entities.Notification.create({
      business_id: job.business_id,
      message: 'Job marked complete by buyer — review pending',
      type: 'job_update',
      read: false,
      related_entity_id: jobId,
    });
    setJob(prev => ({ ...prev, status: 'Completed' }));
    setMarking(false);
  };

  const handleSubmitReview = async () => {
    setReviewError('');
    if (rating === 0) { setReviewError('Please select a star rating.'); return; }
    if (feedback.length < 20) { setReviewError('Feedback must be at least 20 characters.'); return; }
    if (feedback.length > 1000) { setReviewError('Feedback must be 1000 characters or fewer.'); return; }

    setSubmitting(true);
    await base44.entities.Review.create({
      business_id: job.business_id,
      customer_id: job.customer_id,
      job_id: jobId,
      rating,
      text: feedback,
      platform: 'Internal',
      status: 'Pending',
    });
    // Verify the review only if a completed Transaction exists for this job
    try {
      await base44.functions.invoke('verify-review', { job_id: jobId });
    } catch (e) {
      console.error('Verify review failed:', e);
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <p className="text-lg font-medium" style={{ color: '#C06060' }}>{error}</p>
      </div>
    );
  }

  const isComplete = job.status === 'Completed';
  const sc = STATUS_COLORS[job.status] || STATUS_COLORS['No-Show'];

  return (
    <div className="max-w-2xl mx-auto">

      {/* Job Summary Card */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.10)', boxShadow: '0 2px 14px rgba(30,50,69,0.06)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-fraunces)', color: '#1E3245' }}>
              {job.title}
            </h2>
            {business && (
              <p className="text-sm" style={{ color: '#4A6580' }}>{business.name}</p>
            )}
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.text }}>
            {job.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-0.5" style={{ color: '#8DAFC8' }}>Scheduled Date</p>
            <p style={{ color: '#1E3245' }}>
              {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy h:mm a') : '—'}
            </p>
          </div>
          <div>
            <p className="font-medium mb-0.5" style={{ color: '#8DAFC8' }}>Actual Cost</p>
            <p style={{ color: '#1E3245' }}>
              {job.actual_cost != null ? `$${Number(job.actual_cost).toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Mark Complete Button */}
      {!isComplete && (
        <div className="rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-4"
          style={{ background: '#FFF3EA', border: '1.5px solid #E8945A55' }}>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-0.5" style={{ color: '#A05028' }}>Job not yet marked complete</p>
            <p className="text-xs" style={{ color: '#A05028' }}>Once you confirm the work is done, you can leave a review.</p>
          </div>
          <Button
            onClick={handleMarkComplete}
            disabled={marking}
            className="flex-shrink-0 gap-2"
            style={{ background: '#E8945A', color: '#fff' }}
          >
            <CheckCircle className="w-4 h-4" />
            {marking ? 'Updating…' : 'Mark Job as Complete'}
          </Button>
        </div>
      )}

      {/* Review Section — only shown when complete */}
      {isComplete && (
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(30,50,69,0.10)', boxShadow: '0 2px 14px rgba(30,50,69,0.06)' }}>

          {/* Already has a review */}
          {existingReview ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-fraunces)', color: '#1E3245' }}>Your Review</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E4F5EC', color: '#276048' }}>Review submitted</span>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-5 h-5" fill={s <= existingReview.rating ? '#E8945A' : 'none'} stroke={s <= existingReview.rating ? '#E8945A' : '#CBD5E0'} />
                ))}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#2E4A65' }}>{existingReview.text}</p>
            </div>
          ) : submitted ? (
            /* Thank you state */
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#5BAA7E' }} />
              <p className="text-base font-semibold" style={{ color: '#276048' }}>Thank you — your review has been submitted.</p>
            </div>
          ) : (
            /* Review form */
            <div>
              <h3 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-fraunces)', color: '#1E3245' }}>Leave a Review</h3>

              {/* Star selector */}
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: '#1E3245' }}>Rating <span style={{ color: '#C06060' }}>*</span></p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="w-7 h-7"
                        fill={(hoverRating || rating) >= s ? '#E8945A' : 'none'}
                        stroke={(hoverRating || rating) >= s ? '#E8945A' : '#CBD5E0'}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm" style={{ color: '#4A6580' }}>{rating} / 5</span>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="mb-4">
                <label className="text-xs font-medium mb-1 block" style={{ color: '#1E3245' }}>
                  Feedback <span style={{ color: '#C06060' }}>*</span>
                </label>
                <Textarea
                  placeholder="Describe your experience (min 20 characters)…"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs mt-1 text-right" style={{ color: feedback.length < 20 && feedback.length > 0 ? '#C06060' : '#8DAFC8' }}>
                  {feedback.length} / 1000
                </p>
              </div>

              {reviewError && (
                <p className="text-xs mb-3" style={{ color: '#C06060' }}>{reviewError}</p>
              )}

              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
                style={{ background: '#1E3245', color: '#fff' }}
              >
                {submitting ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}