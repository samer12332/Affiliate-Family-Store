'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Card } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function AdminCategories() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, post, put, delete: deleteRequest } = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await get('/categories');
        setCategories(data.categories || []);
      } catch (error) {
        console.error('[v0] Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token, isLoading, router, get]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await put(`/categories/${editingId}`, formData);
        setCategories(
          categories.map((c) => (c._id === editingId ? { ...c, ...formData } : c))
        );
      } else {
        const newCategory = await post('/categories', formData);
        setCategories([...categories, newCategory.category]);
      }
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', slug: '', description: '' });
    } catch (error) {
      console.error('[v0] Failed to save category:', error);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteRequest(`/categories/${categoryId}`);
      setCategories(categories.filter((c) => c._id !== categoryId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('[v0] Failed to delete category:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    });
    setEditingId(category._id);
    setIsFormOpen(true);
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
            <h1 className="text-lg font-bold text-foreground">Categories</h1>
          </div>
          <Button
            onClick={() => {
              setIsFormOpen(true);
              setEditingId(null);
              setFormData({ name: '', slug: '', description: '' });
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Category
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading categories...</p>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No categories found</p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Create your first category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.slug}</p>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(category._id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingId ? 'Edit Category' : 'New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingId(null);
                    setFormData({ name: '', slug: '', description: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Delete Category?
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
