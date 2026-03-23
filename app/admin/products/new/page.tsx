'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { compressImageFile, createObjectPreview } from '@/lib/client-image';
import {
  AVAILABILITY_STATUS,
  GENDER_TYPES,
  MAIN_MERCHANT_COMMISSION_RATE,
  MAX_PRODUCT_IMAGES,
  OWNER_COMMISSION_RATE,
  PRODUCT_CATEGORIES,
} from '@/lib/constants';
import { isAdminRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';

export default function NewProductPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, post, request } = useApi();
  const [shippingSystems, setShippingSystems] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    merchantPrice: '',
    stock: '',
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

    get('/shipping-systems?limit=100')
      .then((data) => {
        setShippingSystems(data.shippingSystems || []);
        if (data.shippingSystems?.[0]?._id) {
          setFormData((prev) => ({ ...prev, shippingSystemId: prev.shippingSystemId || data.shippingSystems[0]._id }));
        }
      })
      .catch((error) => console.error('[v0] Failed to fetch shipping systems', error));
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;
  const role = normalizeRole(admin.role);
  if (!isAdminRole(role) && !isSubmerchantRole(role)) {
    router.push('/admin/dashboard');
    return null;
  }
  const hasMainMerchant = Boolean(admin.mainMerchantId);
  const totalCommissionRate =
    OWNER_COMMISSION_RATE + (hasMainMerchant ? MAIN_MERCHANT_COMMISSION_RATE : 0);
  const isShoesCategory = formData.category === 'Shoes';

  const parseSizeInput = (value: string, isShoes: boolean) => {
    if (isShoes) {
      const sizes = value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      return { sizeWeightChart: [], sizes };
    }

    const sizeWeightChart: Array<{ size: string; minWeightKg: number; maxWeightKg: number }> = [];
    const sizes: string[] = [];

    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const weighted = line.match(/^([A-Za-z0-9]+)\s+(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
        if (weighted) {
          sizeWeightChart.push({
            size: weighted[1].toUpperCase(),
            minWeightKg: Number(weighted[2]),
            maxWeightKg: Number(weighted[3]),
          });
          return;
        }

        sizes.push(line.toUpperCase());
      });

    return { sizeWeightChart, sizes };
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      setError('Only image files can be uploaded for products.');
      event.target.value = '';
      return;
    }

    const mergedFiles = [...selectedFiles, ...files];
    if (mergedFiles.length > MAX_PRODUCT_IMAGES) {
      setError(`You can upload up to ${MAX_PRODUCT_IMAGES} images per product.`);
      event.target.value = '';
      return;
    }

    setError('');
    setSelectedFiles(mergedFiles);
    imagePreviews.forEach((preview) => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    const previews = mergedFiles.map(createObjectPreview);
    setImagePreviews(previews);
    event.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    const nextFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    const nextPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);
    const removedPreview = imagePreviews[indexToRemove];
    if (removedPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(removedPreview);
    }
    setSelectedFiles(nextFiles);
    setImagePreviews(nextPreviews);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!Number.isFinite(Number(formData.merchantPrice)) || Number(formData.merchantPrice) < 0) {
      setError('Please provide a valid merchant price.');
      return;
    }
    if (!formData.shippingSystemId) {
      setError('Please create or select a shipping system before saving this product.');
      return;
    }
    if (!Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0) {
      setError('Please provide a valid non-negative stock quantity.');
      return;
    }
    if (selectedFiles.length > MAX_PRODUCT_IMAGES) {
      setError(`You can upload up to ${MAX_PRODUCT_IMAGES} images per product.`);
      return;
    }

    const { sizeWeightChart, sizes } = parseSizeInput(formData.sizeWeightChart, isShoesCategory);

    try {
      setSaving(true);
      const uploadedImages = await Promise.all(
        selectedFiles.map(async (file) => {
          const compressedFile = await compressImageFile(file);
          const form = new FormData();
          form.append('file', compressedFile);
          const result = await request('/uploads/product-image', {
            method: 'POST',
            body: form,
          });
          return String(result?.url || '');
        })
      );

      await post('/products', {
        ...formData,
        merchantPrice: Number(formData.merchantPrice),
        stock: Number(formData.stock),
        suggestedCommission:
          formData.suggestedCommission === '' ? null : Number(formData.suggestedCommission),
        colors: formData.colors.split(',').map((entry) => entry.trim()).filter(Boolean),
        sizeWeightChart,
        sizes,
        images: uploadedImages.filter(Boolean),
      });

      router.push('/admin/products');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Create product</h1>
          <Link href="/admin/products">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Card className="rounded-3xl p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Product name</label>
              <Input required maxLength={160} placeholder="Product name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Slug</label>
              <Input placeholder="Slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Merchant price</label>
              <Input required type="number" min="0" max="1000000" step="0.01" placeholder="Merchant price" value={formData.merchantPrice} onChange={(e) => setFormData((prev) => ({ ...prev, merchantPrice: e.target.value }))} />
              {isSubmerchantRole(role) && (
                <p className="text-xs text-muted-foreground">
                  This price includes commission deductions of {(totalCommissionRate * 100).toFixed(0)}%
                  ({(OWNER_COMMISSION_RATE * 100).toFixed(0)}% system owner
                  {hasMainMerchant ? ` + ${(MAIN_MERCHANT_COMMISSION_RATE * 100).toFixed(0)}% main merchant` : ''}).
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stock quantity</label>
              <Input required type="number" min="0" max="1000000" step="1" placeholder="Stock quantity" value={formData.stock} onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))} />
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
              <label className="text-sm font-medium text-foreground">{isShoesCategory ? 'Sizes' : 'Sizes by weight'}</label>
              <textarea value={formData.sizeWeightChart} onChange={(e) => setFormData((prev) => ({ ...prev, sizeWeightChart: e.target.value }))} className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder={isShoesCategory ? '41, 42, 43, 44, 45' : 'M 50-65\nL 65-80'} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shipping system</label>
              <select required value={formData.shippingSystemId} onChange={(e) => setFormData((prev) => ({ ...prev, shippingSystemId: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                {shippingSystems.length === 0 && <option value="">No shipping systems available</option>}
                {shippingSystems.map((system) => (
                  <option key={system._id} value={system._id}>{system.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Product images</label>
              <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">
                Images only. Maximum {MAX_PRODUCT_IMAGES} images per product.
              </p>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((src, index) => (
                    <div key={`new-image-preview-${index}`} className="space-y-2">
                      <img src={src} alt={`Selected image ${index + 1}`} className="h-28 w-full rounded-xl border border-border object-cover" />
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
              <textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Description" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving product...' : 'Save product'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
