import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MerchantPageClient, { type MerchantSummary, type MerchantProductSummary, type ShippingSystemSummary } from '@/components/merchant/MerchantPageClient';
import { connectDB } from '@/lib/db';
import { ShippingSystem, User } from '@/lib/models';
import { getMarketplaceProducts } from '@/lib/product-marketplace';
import { isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { verifyToken } from '@/server/utils/auth';

interface MerchantPageProps {
  params: Promise<{ merchantId: string }>;
}

interface ViewerDoc {
  _id: unknown;
  role: string;
  active: boolean;
  mainMerchantId?: unknown;
}

interface MerchantDoc {
  _id: unknown;
  name?: string;
  merchantProfile?: {
    storeName?: string;
  };
}

interface MerchantAccessDoc {
  mainMerchantId?: unknown;
  role?: string;
  active?: boolean;
}

export default async function MerchantPage({ params }: MerchantPageProps) {
  const { merchantId } = await params;

  const authToken = (await cookies()).get('admin-token')?.value || '';
  if (!authToken) {
    redirect('/admin/login');
  }

  const decoded = verifyToken(authToken) as { id?: string } | null;
  if (!decoded?.id) {
    redirect('/admin/login');
  }

  await connectDB();

  const viewer = (await User.findById(decoded.id)
    .select('_id role active mainMerchantId')
    .lean()) as ViewerDoc | null;
  if (!viewer || !viewer.active) {
    redirect('/admin/login');
  }

  if (isSubmerchantRole(normalizeRole(viewer.role))) {
    redirect('/admin/dashboard');
  }

  const merchantDoc = (await User.findOne({
    _id: merchantId,
    role: { $in: ['submerchant', 'merchant'] },
  })
    .select('_id name merchantProfile.storeName')
    .lean()) as MerchantDoc | null;

  const initialMerchant: MerchantSummary | null = merchantDoc
    ? {
        _id: String(merchantDoc._id),
        name: String(merchantDoc.name || ''),
        merchantProfile: {
          storeName: String(merchantDoc.merchantProfile?.storeName || ''),
        },
      }
    : null;

  let initialError = '';
  let initialShippingSystems: ShippingSystemSummary[] = [];

  if (isMarketerRole(normalizeRole(viewer.role)) && viewer.mainMerchantId) {
    const merchantAccessDoc = (await User.findById(merchantId)
      .select('mainMerchantId role active')
      .lean()) as MerchantAccessDoc | null;

    const allowed =
      merchantAccessDoc &&
      merchantAccessDoc.active &&
      isSubmerchantRole(merchantAccessDoc.role) &&
      String(merchantAccessDoc.mainMerchantId || '') === String(viewer.mainMerchantId || '');

    if (!allowed) {
      initialError = 'You cannot access this merchant page.';
    }
  }

  if (!initialError) {
    const shippingSystems = await ShippingSystem.find({ merchantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('_id name notes governorateFees')
      .lean();

    initialShippingSystems = shippingSystems.map((system: any) => ({
      _id: String(system._id),
      name: String(system.name || ''),
      notes: typeof system.notes === 'string' ? system.notes : '',
      governorateFees: Array.isArray(system.governorateFees)
        ? system.governorateFees.map((fee: any) => ({
            governorate: String(fee.governorate || ''),
            fee: Number(fee.fee || 0),
          }))
        : [],
    }));
  }

  const marketplace = !initialError
    ? await getMarketplaceProducts({
        user: viewer,
        merchantId,
        sort: '-createdAt',
        page: 1,
        limit: 100,
        includeTotal: false,
      })
    : { products: [] as any[] };

  const initialProducts: MerchantProductSummary[] = Array.isArray(marketplace.products)
    ? marketplace.products.map((product: any) => ({
        _id: String(product._id),
        merchantId: String(product.merchantId || merchantId),
        name: String(product.name || ''),
        slug: String(product.slug || ''),
        description: typeof product.description === 'string' ? product.description : '',
        merchantPrice: Number(product.merchantPrice || product.price || 0),
        price: Number(product.price || 0),
        suggestedCommission:
          product.suggestedCommission === null || product.suggestedCommission === undefined
            ? null
            : Number(product.suggestedCommission),
        shippingSystemId: String(product.shippingSystemId || ''),
        stock: Number(product.stock || 0),
        category: typeof product.category === 'string' ? product.category : '',
        images: Array.isArray(product.images) ? product.images.map((image: any) => String(image)) : [],
      }))
    : [];

  return (
    <MerchantPageClient
      merchantId={merchantId}
      initialMerchant={initialMerchant}
      initialProducts={initialProducts}
      initialShippingSystems={initialShippingSystems}
      initialError={initialError}
    />
  );
}

