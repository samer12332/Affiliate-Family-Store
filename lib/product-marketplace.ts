import { unstable_cache } from 'next/cache';
import { Product, User } from '@/lib/models';
import { isMainMerchantRole, isMarketerRole, isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { safeTrim } from '@/lib/validation';

const PAGE_SIZE_DEFAULT = 24;
const SNAPSHOT_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

let lastSnapshotSyncAt = 0;
let snapshotSyncPromise: Promise<void> | null = null;

async function hasLegacyMarketplaceSnapshots() {
  const product = await Product.findOne({
    $or: [
      { merchantDisplayName: { $exists: false } },
      { merchantMainMerchantId: { $exists: false } },
      { marketplaceVisible: { $exists: false } },
    ],
  })
    .select('_id')
    .lean();

  return Boolean(product);
}

const getCachedPublicCategoryProducts = unstable_cache(
  async (
    nextCategory: string,
    nextGender: string | undefined,
    nextStatus: string | undefined,
    nextSort: string,
    nextPage: number,
    nextLimit: number
  ) => {
    await syncAllMarketplaceProductSnapshots();

    const query: any = {
      marketplaceVisible: true,
      category: nextCategory,
    };
    if (nextGender) {
      query.gender = nextGender;
    }
    if (nextStatus) {
      query.availabilityStatus = nextStatus;
    }

    const skip = Math.max(nextPage - 1, 0) * nextLimit;
    const products = await Product.find(query)
      .sort(Object.fromEntries(getProductSort(nextSort)))
      .skip(skip)
      .limit(nextLimit + 1)
      .select(
        '_id name slug price discountPrice images category gender featured onSale availabilityStatus'
      )
      .lean()
      .exec();

    const normalizedProducts = products.slice(0, nextLimit);

    return {
      products: normalizedProducts.map((product: any) => ({
        _id: String(product._id),
        name: product.name,
        slug: product.slug,
        price: Number(product.price || 0),
        discountPrice: product.discountPrice !== undefined ? Number(product.discountPrice) : undefined,
        images: Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [],
        category: product.category,
        gender: product.gender,
        featured: Boolean(product.featured),
        onSale: Boolean(product.onSale),
        availabilityStatus: product.availabilityStatus,
      })),
      hasMore: products.length > nextLimit,
    };
  },
  ['public-category-products'],
  { revalidate: 300 }
);

export function getProductSort(sort: string) {
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

export async function getLegacyMainMerchantIds() {
  return (await User.distinct('mainMerchantId', { mainMerchantId: { $ne: null } }))
    .filter(Boolean)
    .map((id: any) => id?.toString?.() || String(id));
}

function buildMerchantSnapshot(merchant: any, legacyMainMerchantIds: Set<string>) {
  const merchantId = merchant?._id?.toString?.() || String(merchant?._id || '');
  const normalizedRole = normalizeRole(String(merchant?.role || ''));
  const merchantDisplayName = safeTrim(
    merchant?.merchantProfile?.storeName || merchant?.name || 'Merchant',
    160
  );
  const merchantMainMerchantId = merchant?.mainMerchantId?.toString?.() || null;
  const marketplaceVisible =
    isSubmerchantRole(normalizedRole) ||
    (normalizedRole === 'merchant' && !legacyMainMerchantIds.has(merchantId));

  return {
    merchantId,
    merchantDisplayName,
    merchantMainMerchantId,
    marketplaceVisible,
  };
}

export async function syncMarketplaceProductSnapshotForMerchant(merchantId: string) {
  const merchant: any = await User.findById(merchantId)
    .select('_id role name mainMerchantId merchantProfile.storeName')
    .lean();

  if (!merchant) {
    await Product.updateMany(
      { merchantId },
      {
        $set: {
          merchantDisplayName: 'Merchant',
          merchantMainMerchantId: null,
          marketplaceVisible: false,
        },
      }
    );
    return;
  }

  const legacyMainMerchantIds = new Set(await getLegacyMainMerchantIds());
  const snapshot = buildMerchantSnapshot(merchant, legacyMainMerchantIds);

  await Product.updateMany(
    { merchantId: merchant._id },
    {
      $set: {
        merchantDisplayName: snapshot.merchantDisplayName,
        merchantMainMerchantId: snapshot.merchantMainMerchantId,
        marketplaceVisible: snapshot.marketplaceVisible,
      },
    }
  );
}

export async function syncAllMarketplaceProductSnapshots(force = false) {
  const now = Date.now();
  if (!force && lastSnapshotSyncAt > 0 && now - lastSnapshotSyncAt < SNAPSHOT_SYNC_COOLDOWN_MS) {
    return;
  }

  if (snapshotSyncPromise) {
    return snapshotSyncPromise;
  }

  snapshotSyncPromise = (async () => {
    if (!force) {
      const needsSync = await hasLegacyMarketplaceSnapshots();
      if (!needsSync) {
        lastSnapshotSyncAt = Date.now();
        return;
      }
    }

    const merchants = await User.find({ role: { $in: ['submerchant', 'merchant'] } })
      .select('_id role name mainMerchantId merchantProfile.storeName')
      .lean();
    const legacyMainMerchantIds = new Set(await getLegacyMainMerchantIds());

    if (merchants.length === 0) {
      lastSnapshotSyncAt = Date.now();
      return;
    }

    await Product.bulkWrite(
      merchants.map((merchant: any) => {
        const snapshot = buildMerchantSnapshot(merchant, legacyMainMerchantIds);
        return {
          updateMany: {
            filter: { merchantId: merchant._id },
            update: {
              $set: {
                merchantDisplayName: snapshot.merchantDisplayName,
                merchantMainMerchantId: snapshot.merchantMainMerchantId,
                marketplaceVisible: snapshot.marketplaceVisible,
              },
            },
          },
        };
      }),
      { ordered: false }
    );

    lastSnapshotSyncAt = Date.now();
  })().finally(() => {
    snapshotSyncPromise = null;
  });

  return snapshotSyncPromise;
}

export async function getMarketplaceBaseQueryForUser(user: any) {
  const actorRole = normalizeRole(user?.role);

  if (isSubmerchantRole(actorRole)) {
    return { merchantId: user._id };
  }

  if (isMainMerchantRole(actorRole)) {
    const submerchantIds = await User.find({
      role: { $in: ['submerchant', 'merchant'] },
      mainMerchantId: user._id,
      active: true,
    }).distinct('_id');

    return { merchantId: { $in: submerchantIds } };
  }

  if (isMarketerRole(actorRole)) {
    if (user.mainMerchantId) {
      return {
        marketplaceVisible: true,
        merchantMainMerchantId: user.mainMerchantId,
      };
    }

    return { marketplaceVisible: true };
  }

  return {};
}

export function shapeMarketplaceProduct(product: any) {
  const firstImage = Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [];

  return {
    _id: product._id,
    merchantId: product.merchantId,
    merchantName: product.merchantDisplayName || 'Merchant',
    images: firstImage,
    name: product.name,
    slug: product.slug,
    description: safeTrim(product.description || '', 220),
    merchantPrice: product.merchantPrice,
    price: product.price,
    suggestedCommission: product.suggestedCommission,
    shippingSystemId: product.shippingSystemId,
    stock: product.stock,
    category: product.category,
  };
}

export async function getMarketplaceProducts({
  user,
  merchantId,
  category,
  sort,
  search,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
  includeTotal = true,
}: {
  user: any;
  merchantId?: string | null;
  category?: string | null;
  sort: string;
  search?: string;
  page?: number;
  limit?: number;
  includeTotal?: boolean;
}) {
  await syncAllMarketplaceProductSnapshots();

  const baseQuery = await getMarketplaceBaseQueryForUser(user);
  const query: any = { ...baseQuery };
  if (merchantId) {
    query.merchantId = merchantId;
  }
  if (category) {
    query.category = category;
  }

  if (search) {
    const trimmedSearch = safeTrim(search, 120);
    if (trimmedSearch) {
      query.$text = { $search: trimmedSearch };
    }
  }

  const skip = Math.max(page - 1, 0) * limit;
  const queryLimit = includeTotal ? limit : limit + 1;
  const productQuery = Product.find(query)
    .sort(
      query.$text
        ? ({ score: { $meta: 'textScore' }, createdAt: -1 } as any)
        : Object.fromEntries(getProductSort(sort))
    )
    .skip(skip)
    .limit(queryLimit)
    .select(
      '_id merchantId merchantDisplayName name slug description merchantPrice price suggestedCommission images shippingSystemId stock category'
    );

  if (query.$text) {
    productQuery.select({ score: { $meta: 'textScore' } } as any);
  }

  const [products, total] = await Promise.all([
    productQuery.lean().exec(),
    includeTotal ? Product.countDocuments(query) : Promise.resolve(null),
  ]);

  const normalizedProducts = !includeTotal ? products.slice(0, limit) : products;

  return {
    products: normalizedProducts.map(shapeMarketplaceProduct),
    total,
    hasMore: !includeTotal ? products.length > limit : skip + normalizedProducts.length < Number(total || 0),
    pagination: {
      page,
      limit,
      total,
      pages: total === null ? null : Math.ceil(total / limit),
    },
  };
}

export async function getPublicCategoryProducts({
  category,
  gender,
  status,
  sort,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
}: {
  category: string;
  gender?: string;
  status?: string;
  sort: string;
  page?: number;
  limit?: number;
}) {
  return getCachedPublicCategoryProducts(category, gender, status, sort, page, limit);
}
