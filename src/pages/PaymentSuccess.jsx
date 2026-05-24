import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const planType = searchParams.get('plan_type') || 'plan';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* CSS-drawn checkmark circle */}
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#10b981" strokeWidth="3" />
              <path
                d="M 35 50 L 45 60 L 65 40"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Payment successful</h1>
          <p className="text-lg text-slate-600">
            Your <span className="font-semibold capitalize">{planType}</span> plan is now active. It may take a moment to reflect.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap justify-center pt-4">
          <Link to="/seller/ads">
            <Button className="bg-navy text-white hover:bg-navy-light px-6">
              View my ads
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="px-6">
              Go to dashboard
            </Button>
          </Link>
        </div>

        {/* Receipt note */}
        <p className="text-xs text-slate-500 pt-4">
          A receipt has been sent to your registered email.
        </p>
      </div>
    </div>
  );
}