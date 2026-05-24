import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const getReasonText = () => {
    switch (reason) {
      case 'declined':
        return 'Your card was declined. Please check your card details.';
      case 'expired':
        return 'Your payment session expired. Please try again.';
      default:
        return 'Please try again or contact support.';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-red-50 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* CSS-drawn warning circle with exclamation */}
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#f59e0b" strokeWidth="3" />
              <text
                x="50"
                y="65"
                fontSize="48"
                fontWeight="bold"
                textAnchor="middle"
                fill="#f59e0b"
              >
                !
              </text>
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Payment unsuccessful</h1>
          <p className="text-lg text-slate-600">
            We weren't able to process your payment. No charge has been made.
          </p>
        </div>

        {/* Reason text */}
        <p className="text-slate-700 bg-white border border-amber-100 rounded-lg px-4 py-3">
          {getReasonText()}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap justify-center pt-4">
          <Link to="/seller/ads">
            <Button className="bg-navy text-white hover:bg-navy-light px-6">
              Try again
            </Button>
          </Link>
          <Link to="/support">
            <Button variant="outline" className="px-6">
              Contact support
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}