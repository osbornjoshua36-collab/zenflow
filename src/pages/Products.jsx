import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Package, Eye, Box, DollarSign } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import ProductFormDialog from '@/components/products/ProductFormDialog';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const loadData = async () => {
    const bizList = await base44.entities.Business.list('-created_date', 1);
    const biz = bizList[0];
    if (biz) setBusinessId(biz.id);
    const items = await base44.entities.Product.filter({ business_id: biz?.id || 'none' }, '-created_date', 200);
    setProducts(items);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (p) => { await base44.entities.Product.delete(p.id); loadData(); };
  const handleToggle = async (p) => {
    await base44.entities.Product.update(p.id, { status: p.status === 'Active' ? 'Draft' : 'Active' });
    loadData();
  };

  const active = products.filter(p => p.status === 'Active');
  const soldOut = products.filter(p => p.status === 'Sold Out');
  const totalValue = active.reduce((s, p) => s + Number(p.price) * (p.quantity_available || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Products', value: active.length, icon: Eye, color: 'text-blue-600' },
          { label: 'Total Listings', value: products.length, icon: Package, color: 'text-slate-600' },
          { label: 'Sold Out', value: soldOut.length, icon: Box, color: 'text-orange-600' },
          { label: 'Inventory Value', value: `$${totalValue.toFixed(0)}`, icon: DollarSign, color: 'text-green-600' },
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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Product Catalog</h2>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => { setEditProduct(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Product
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500">No products yet. Add your first product to start selling.</p>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onEdit={(prod) => { setEditProduct(prod); setShowForm(true); }} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <ProductFormDialog open={showForm} onClose={() => { setShowForm(false); setEditProduct(null); }} onSaved={loadData} businessId={businessId} existing={editProduct} />
    </div>
  );
}