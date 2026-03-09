'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AVAILABILITY_STATUS, GENDER_TYPES, PRODUCT_CATEGORIES } from '@/lib/constants';

interface ShippingSystem {
  _id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const { token, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingSystems, setShippingSystems] = useState<ShippingSystem[]>([]);
  const [shippingSystemsLoading, setShippingSystemsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    category: PRODUCT_CATEGORIES[0],
    gender: GENDER_TYPES[0],
    colors: '',
    sizeWeightChart: '',
    shippingSystemId: '',
    availabilityStatus: AVAILABILITY_STATUS[0],
    description: '',
    featured: false,
    onSale: false,
  });

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/admin/login');
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    const fetchShippingSystems = async () => {
      try {
        const data = await get('/shipping-systems');
        const systems = data.shippingSystems || [];
        setShippingSystems(systems);
        if (systems.length > 0) {
          setFormData((prev) => ({
            ...prev,
            shippingSystemId: prev.shippingSystemId || systems[0]._id,
          }));
        }
      } catch (err) {
        setError('Failed to load shipping systems');
      } finally {
        setShippingSystemsLoading(false);
      }
    };

    fetchShippingSystems();
  }, [token, get]);

  if (isLoading || !token) return null;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read selected image'));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const mergedFiles = [...selectedFiles, ...files];
    setSelectedFiles(mergedFiles);

    try {
      const previews = await Promise.all(mergedFiles.map(fileToDataUrl));
      setImagePreviews(previews);
    } catch {
      setError('Could not read selected images');
      setImagePreviews([]);
    }

    // Allow selecting the same file again in a subsequent pick.
    e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    const nextFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    const nextPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(nextFiles);
    setImagePreviews(nextPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.shippingSystemId) {
        setError('Please select a shipping system');
        setLoading(false);
        return;
      }

      const parsedSizeWeightChart = formData.sizeWeightChart
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const match = line.match(
            /^([A-Za-z0-9]+)\s+(\d+(?:\.\d+)?)(?:\s*[-–—]\s*|\s+)(\d+(?:\.\d+)?)(?:\s*kg)?$/i
          );
          if (!match) return null;
          return {
            size: match[1].toUpperCase(),
            minWeightKg: Number(match[2]),
            maxWeightKg: Number(match[3]),
          };
        });

      if (parsedSizeWeightChart.some((entry) => entry === null)) {
        setError('Invalid size-weight format. Use lines like: XL 55-75 kg or XL 55 75 kg');
        setLoading(false);
        return;
      }

      const uploadedImages = await Promise.all(selectedFiles.map(fileToDataUrl));
      const payload = {
        ...formData,
        price: Number(formData.price),
        colors: formData.colors
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0),
        sizeWeightChart: parsedSizeWeightChart,
        images: uploadedImages,
      };

      await post('/products', payload);
      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/products">
              <Button variant="ghost" size="sm">
                Back to Products
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-foreground">New Product</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="optional-custom-slug"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                >
                  {PRODUCT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                >
                  {GENDER_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Available Colors
              </label>
              <Input
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                placeholder="Black, White, Navy Blue"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter color names separated by commas. Customers will choose one before adding to cart.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Size vs Weight (Kg)
              </label>
              <textarea
                value={formData.sizeWeightChart}
                onChange={(e) => setFormData({ ...formData, sizeWeightChart: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                placeholder={'XL 55-75 kg\nXXL 75-100 kg'}
              />
              <p className="text-xs text-muted-foreground mt-2">
                One line per size. Format: SIZE min-max kg
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Shipping System
              </label>
              <select
                value={formData.shippingSystemId}
                onChange={(e) => setFormData({ ...formData, shippingSystemId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
                required
                disabled={shippingSystemsLoading}
              >
                {shippingSystems.length === 0 ? (
                  <option value="">No shipping systems available</option>
                ) : (
                  shippingSystems.map((system) => (
                    <option key={system._id} value={system._id}>
                      {system.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Create and manage shipping systems in Admin Dashboard.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Availability</label>
              <select
                value={formData.availabilityStatus}
                onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              >
                {AVAILABILITY_STATUS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Upload Images (from your device)
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              {selectedFiles.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedFiles.length} image(s) selected
                </p>
              )}
              {imagePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {imagePreviews.map((src, index) => (
                    <div key={index} className="relative">
                      <img
                        src={src}
                        alt={`Selected ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded px-1.5 py-0.5"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formData.onSale}
                  onChange={(e) => setFormData({ ...formData, onSale: e.target.checked })}
                />
                On Sale
              </label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Link href="/admin/products" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
