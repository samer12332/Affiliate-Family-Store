import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CartPageClient from '@/components/cart/CartPageClient';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { isSubmerchantRole, normalizeRole } from '@/lib/roles';
import { verifyToken } from '@/server/utils/auth';

export default async function CartPage() {
  const authToken = (await cookies()).get('admin-token')?.value || '';
  if (!authToken) {
    redirect('/admin/login');
  }

  const decoded = verifyToken(authToken) as { id?: string } | null;
  if (!decoded?.id) {
    redirect('/admin/login');
  }

  await connectDB();
  const viewer = await User.findById(decoded.id).select('_id role active');
  if (!viewer || !viewer.active) {
    redirect('/admin/login');
  }

  if (isSubmerchantRole(normalizeRole(viewer.role))) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ef,#f3efe8_45%,#faf8f4)]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <CartPageClient />
      </main>
    </div>
  );
}
