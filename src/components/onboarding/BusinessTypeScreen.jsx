import { Button } from '@/components/ui/button';
import { Wrench, ShoppingBag, ArrowRight } from 'lucide-react';

export default function BusinessTypeScreen({ onSelect, onBack }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-[#FAFCFF]">
      <div className="w-full max-w-3xl mb-4">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
      </div>
      <div className="w-full max-w-3xl text-center mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'var(--font-fraunces)' }}>
          What do you sell?
        </h1>
        <p className="text-slate-500">This determines which tools appear in your dashboard. You can't change this later.</p>
      </div>
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          onClick={() => onSelect('services')}
          className="text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-[#E8945A] hover:shadow-md transition-all"
        >
          <Wrench className="w-10 h-10 text-[#E8945A] mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Services</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            You provide a service — plumbing, cleaning, tutoring, consulting. Get matched with customers, manage jobs, schedule appointments, and send invoices.
          </p>
          <div className="flex items-center gap-1 mt-4 text-[#E8945A] text-sm font-medium">
            Choose Services <ArrowRight className="w-4 h-4" />
          </div>
        </button>
        <button
          onClick={() => onSelect('products')}
          className="text-left rounded-2xl border-2 border-slate-200 bg-white p-8 hover:border-[#E8945A] hover:shadow-md transition-all"
        >
          <ShoppingBag className="w-10 h-10 text-[#E8945A] mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Products</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            You sell physical goods — handmade crafts, electronics, clothing. Manage your product catalog, track inventory, and fulfill orders with shipping or pickup.
          </p>
          <div className="flex items-center gap-1 mt-4 text-[#E8945A] text-sm font-medium">
            Choose Products <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}