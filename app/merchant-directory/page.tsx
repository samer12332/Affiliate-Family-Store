import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MarketerMarketplaceClient from '@/components/marketplace/MarketerMarketplaceClient';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { getMarketplaceProducts } from '@/lib/product-marketplace';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { verifyToken } from '@/server/utils/auth';

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

  const { products, hasMore } = await getMarketplaceProducts({
    user: viewer,
    sort: '-createdAt',
    page: 1,
    limit: 24,
    includeTotal: false,
  });

  return (
    <MarketerMarketplaceClient
      authToken={authToken}
      initialProducts={products}
      initialHasMore={hasMore}
    />
  );
}
