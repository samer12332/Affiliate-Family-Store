import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MarketerMarketplaceClient from '@/components/marketplace/MarketerMarketplaceClient';
import { connectDB } from '@/lib/db';
import { Product, User } from '@/lib/models';
import { isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { safeTrim } from '@/lib/validation';
import { verifyToken } from '@/server/utils/auth';

const PAGE_SIZE = 24;

type MarketplaceProduct = {
  _id: string;
  merchantId: string;
  merchantName: string;
  images: string[];
  name: string;
  slug: string;
  description: string;
  merchantPrice: number;
  price: number;
  suggestedCommission: number | null;
  shippingSystemId: string;
  stock: number;
  category: string;
};

function getProductSort(sort: string) {
  switch (sort) {
    case 'price':
      return [['price', 1], ['createdAt', -1]] as [string, 1 | -1][];
    case '-price':
      return [['price', -1], ['createdAt', -1]] as [string, 1 | -1][];
    case 'name':
      return [['name', 1], ['createdAt', -1]] as [string, 1 | -1][];
    default:
      return [['createdAt', -1]] as [string, 1 | -1][];
  }
}

async function getLegacyMainMerchantIds() {
  return (await User.distinct('mainMerchantId', { mainMerchantId: { $ne: null } }))
    .filter(Boolean)
    .map((id: any) => id?.toString?.() || String(id));
}

async function getEligibleSubmerchantIds(mainMerchantId?: any) {
  const legacyMainMerchantIds = await getLegacyMainMerchantIds();
  const query: any = {
    active: true,
    $or: [
      { role: 'submerchant' },
      { role: 'merchant', _id: { $nin: legacyMainMerchantIds } },
    ],
  };

  if (mainMerchantId) {
    query.mainMerchantId = mainMerchantId;
  }

  return (await User.find(query).distinct('_id')).map((id: any) => id?.toString?.() || String(id));
}

function shapeMarketplaceProducts(products: any[]): MarketplaceProduct[] {
  return products.map((product) => ({
    _id: String(product._id),
    merchantId: String(product.merchantId),
    merchantName: String(product.merchantName || 'Merchant'),
    images: Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [],
    name: String(product.name || ''),
    slug: String(product.slug || ''),
    description: safeTrim(String(product.description || ''), 220),
    merchantPrice: Number(product.merchantPrice || 0),
    price: Number(product.price || 0),
    suggestedCommission:
      product.suggestedCommission === null || product.suggestedCommission === undefined
        ? null
        : Number(product.suggestedCommission),
    shippingSystemId: String(product.shippingSystemId || ''),
    stock: Number(product.stock || 0),
    category: String(product.category || ''),
  }));
}

async function getInitialMarketplaceProducts(user: any) {
  const query: any = {};
  const actorRole = normalizeRole(user?.role);

  if (isSubmerchantRole(actorRole)) {
    query.merchantId = user._id;
  } else if (isMarketerRole(actorRole)) {
    const submerchantIds = await getEligibleSubmerchantIds(user.mainMerchantId || undefined);
    query.merchantId = { $in: submerchantIds };
  }

  const products = await Product.aggregate([
    { $match: query },
    { $sort: Object.fromEntries(getProductSort('-createdAt')) },
    { $limit: PAGE_SIZE + 1 },
    {
      $lookup: {
        from: 'users',
        localField: 'merchantId',
        foreignField: '_id',
        as: 'merchant',
      },
    },
    {
      $addFields: {
        merchantName: {
          $let: {
            vars: {
              merchantDoc: { $arrayElemAt: ['$merchant', 0] },
            },
            in: {
              $ifNull: ['$$merchantDoc.merchantProfile.storeName', '$$merchantDoc.name'],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        merchantId: 1,
        merchantName: 1,
        name: 1,
        slug: 1,
        description: 1,
        merchantPrice: 1,
        price: 1,
        suggestedCommission: 1,
        images: 1,
        shippingSystemId: 1,
        stock: 1,
        category: 1,
      },
    },
  ]).exec();

  return {
    products: shapeMarketplaceProducts(products.slice(0, PAGE_SIZE)),
    hasMore: products.length > PAGE_SIZE,
  };
}

export default async function MerchantDirectoryPage() {
  const authToken = (await cookies()).get('admin-token')?.value || '';
  if (!authToken) {
    redirect('/admin/login');
  }

  const decoded = verifyToken(authToken) as { id?: string } | null;
  if (!decoded?.id) {
    redirect('/admin/login');
  }

  await connectDB();
  const viewer = await User.findById(decoded.id).select('_id role active mainMerchantId');
  if (!viewer || !viewer.active) {
    redirect('/admin/login');
  }

  if (isSubmerchantRole(normalizeRole(viewer.role))) {
    redirect('/admin/dashboard');
  }

  const { products, hasMore } = await getInitialMarketplaceProducts(viewer);

  return (
    <MarketerMarketplaceClient
      authToken={authToken}
      initialProducts={products}
      initialHasMore={hasMore}
    />
  );
}
