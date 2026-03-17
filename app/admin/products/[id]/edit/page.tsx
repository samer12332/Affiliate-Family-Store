'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AVAILABILITY_STATUS, GENDER_TYPES, PRODUCT_CATEGORIES } from '@/lib/constants';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, put } = useApi();
  const [shippingSystems, setShippingSystems] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    merchantPrice: '',
    suggestedCommission: '',
    category: PRODUCT_CATEGORIES[0],
    gender: GENDER_TYPES[0],
    colors: '',
    sizeWeightChart: '',
    shippingSystemId: '',
    availabilityStatus: AVAILABILITY_STATUS[0],
    description: '',
  });

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    Promise.all([get(`/products/${id}`), get('/shipping-systems?limit=100')])
      .then(([productRes, shippingRes]) => {
        const product = productRes.product;
        setShippingSystems(shippingRes.shippingSystems || []);
        setImages(
          Array.isArray(product.images) && product.images.length > 0 ? product.images : []
        );
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          merchantPrice: String(product.merchantPrice || product.price || ''),
          suggestedCommission:
            product.suggestedCommission === null || product.suggestedCommission === undefined
              ? ''
              : String(product.suggestedCommission),
          category: product.category || PRODUCT_CATEGORIES[0],
          gender: product.gender || GENDER_TYPES[0],
          colors: Array.isArray(product.colors) ? product.colors.join(', ') : '',
          sizeWeightChart: Array.isArray(product.sizeWeightChart)
            ? product.sizeWeightChart.map((entry: any) => `${entry.size} ${entry.minWeightKg}-${entry.maxWeightKg}`).join('\n')
            : '',
          shippingSystemId: product.shippingSystemId || '',
          availabilityStatus: product.availabilityStatus || AVAILABILITY_STATUS[0],
          description: product.description || '',
        });
      })
      .catch((error) => console.error('[v0] Failed to load product editor', error));
  }, [get, id, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read selected image'));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const previews = await Promise.all(files.map(fileToDataUrl));
    setSelectedFiles((prev) => [...prev, ...files]);
    setImages((prev) => [...prev, ...previews]);
    event.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sizeWeightChart = formData.sizeWeightChart
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Za-z0-9]+)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
        if (!match) return null;
        return {
          size: match[1].toUpperCase(),
          minWeightKg: Number(match[2]),
          maxWeightKg: Number(match[3]),
        };
      })
      .filter(Boolean);

    await put(`/products/${id}`, {
      ...formData,
      merchantPrice: Number(formData.merchantPrice),
      suggestedCommission:
        formData.suggestedCommission === '' ? null : Number(formData.suggestedCommission),
      colors: formData.colors.split(',').map((entry) => entry.trim()).filter(Boolean),
      sizeWeightChart,
      images: images.map((entry) => entry.trim()).filter(Boolean),
    });
    router.push('/admin/products');
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Edit product</h1>
          <Link href="/admin/products">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card className="rounded-3xl p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product name</label>
              <Input placeholder="Product name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Slug</label>
              <Input placeholder="Slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Merchant price</label>
              <Input type="number" min="0" step="0.01" placeholder="Merchant price" value={formData.merchantPrice} onChange={(e) => setFormData((prev) => ({ ...prev, merchantPrice: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Suggested commission (optional)</label>
              <Input type="number" min="0" step="0.01" placeholder="Suggested commission" value={formData.suggestedCommission} onChange={(e) => setFormData((prev) => ({ ...prev, suggestedCommission: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select value={formData.category} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {PRODUCT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Gender</label>
              <select value={formData.gender} onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {GENDER_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Colors</label>
              <Input placeholder="Colors separated by commas" value={formData.colors} onChange={(e) => setFormData((prev) => ({ ...prev, colors: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sizes by weight</label>
              <textarea value={formData.sizeWeightChart} onChange={(e) => setFormData((prev) => ({ ...prev, sizeWeightChart: e.target.value }))} className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shipping system</label>
              <select value={formData.shippingSystemId} onChange={(e) => setFormData((prev) => ({ ...prev, shippingSystemId: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {shippingSystems.map((system) => (
                  <option key={system._id} value={system._id}>{system.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Product images</label>
              <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((src, index) => (
                    <div key={`edit-image-preview-${index}`} className="space-y-2">
                      <img src={src} alt={`Product image ${index + 1}`} className="h-28 w-full rounded-xl border border-border object-cover" />
                      <Button type="button" variant="outline" className="w-full" onClick={() => removeImage(index)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Availability status</label>
              <select value={formData.availabilityStatus} onChange={(e) => setFormData((prev) => ({ ...prev, availabilityStatus: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {AVAILABILITY_STATUS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            </div>

            <Button type="submit" className="w-full">Save changes</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
