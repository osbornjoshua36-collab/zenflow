import { Badge } from '@/components/ui/badge';
import { Package, Edit, Trash2, Eye } from 'lucide-react';

const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800',
  Draft: 'bg-slate-100 text-slate-600',
  'Sold Out': 'bg-orange-100 text-orange-700',
  Archived: 'bg-red-100 text-red-600',
};

export default function ProductCard({ product, onEdit, onDelete, onToggle, compact }) {
  const img = product.images?.[0];
  return (
    <div className={`rounded-xl border bg-white overflow-shadow ${compact ? '' : 'shadow-sm'}`} style={{ boxShadow: '0 1px 4px rgba(30,50,69,0.06)' }}>
      <div className="relative aspect-square bg-slate-100">
        {img ? (
          <img src={img} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className={STATUS_COLORS[product.status] || 'bg-slate-100'}>{product.status}</Badge>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-slate-900 truncate">{product.title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-slate-900">${Number(product.price).toFixed(2)}</span>
          <span className="text-xs text-slate-400">{product.quantity_available} in stock</span>
        </div>
        {product.condition && product.condition !== 'New' && (
          <p className="text-xs text-slate-400 mt-1">Condition: {product.condition}</p>
        )}
        {(product.fulfillment_method === 'Shipping' || product.fulfillment_method === 'Both') && product.shipping_flat_rate != null && (
          <p className="text-xs text-slate-400 mt-0.5">+ ${Number(product.shipping_flat_rate).toFixed(2)} shipping</p>
        )}
        {(onEdit || onDelete || onToggle) && (
          <div className="flex gap-2 mt-3">
            {onToggle && (
              <button onClick={() => onToggle(product)} className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
                {product.status === 'Active' ? 'Pause' : 'Activate'}
              </button>
            )}
            {onEdit && (
              <button onClick={() => onEdit(product)} className="px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(product)} className="px-2 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}