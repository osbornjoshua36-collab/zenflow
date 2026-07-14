import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import ProductFormDialog from '@/components/products/ProductFormDialog';

export default function MyListings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const loadData = async () => {
    const me = await base44.auth.me();
    if (!me) { setLoading(false); return; }
    setUserEmail(me.email);
    const items = await base44.entities.Product.filter({ seller_email: me.email }, '-created_date', 200);
    setProducts(items);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (p) => { await base44.entities.Product.delete(p.id); loadData(); };
  const handleToggle = async (p) => {
    await base44.entities.Product.update(p.id, { status: p.status === 'Active' ? 'Draft' : 'Active' });
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-fraunces)' }}>My Listings</h2>
          <p className="text-sm text-muted-foreground">sell items you've made or no longer need</p>
        </div>
        <Button className="gap-2" style={{ background: '#E8945A', color: '#fff' }} onClick={() => { setEditProduct(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Product
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-terracotta rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500">No products yet. List your first item to start selling.</p>
          <Button className="gap-2" style={{ background: '#E8945A', color: '#fff' }} onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> List a Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onEdit={(prod) => { setEditProduct(prod); setShowForm(true); }} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      <ProductFormDialog open={showForm} onClose={() => { setShowForm(false); setEditProduct(null); }} onSaved={loadData} sellerEmail={userEmail} existing={editProduct} />
    </div>
  );
}