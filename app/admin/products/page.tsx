'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  availabilityStatus: string;
  featured: boolean;
}

export default function AdminProducts() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, delete: deleteRequest } = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(search && { search }),
          ...(category && { category }),
        });
        const data = await get(`/products?${query}`);
        setProducts(data.products || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      } catch (error) {
        console.error('[v0] Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token, isLoading, router, currentPage, search, category, get]);

  const handleDelete = async (productId: string) => {
    try {
      await deleteRequest(`/products/${productId}`);
      setProducts(products.filter((p) => p._id !== productId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('[v0] Failed to delete product:', error);
    }
  };

  if (isLoading || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                ← Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">Products</h1>
          </div>
          <Link href="/admin/products/new">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              New Product
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Search by name or SKU
              </label>
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              >
                <option value="">All Categories</option>
                <option value="Clothes">Clothes</option>
                <option value="Shoes">Shoes</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Products Table */}
        <Card className="p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No products found</p>
              <Link href="/admin/products/new">
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  Create your first product
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Price
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">
                        Status
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-foreground">{product.name}</td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {product.category}
                        </td>
                        <td className="py-3 px-4 text-foreground font-medium">
                          ${product.price}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {product.availabilityStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/admin/products/${product._id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(product._id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Delete Product?
            </h2>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
