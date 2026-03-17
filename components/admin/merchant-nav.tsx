'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', match: 'exact' as const },
  { href: '/admin/products', label: 'Products', match: 'startsWith' as const },
  { href: '/admin/stocks', label: 'Stock', match: 'startsWith' as const },
  { href: '/admin/orders', label: 'Orders', match: 'startsWith' as const },
  { href: '/admin/commissions', label: 'Commissions', match: 'startsWith' as const },
  { href: '/admin/notifications', label: 'Notifications', match: 'startsWith' as const },
  { href: '/admin/shipping-systems', label: 'Shipping', match: 'startsWith' as const },
];

export function MerchantNav() {
  const pathname = usePathname();

  const isActive = (href: string, match: 'exact' | 'startsWith') =>
    match === 'exact' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {links.map((item) => {
        const active = isActive(item.href, item.match);

        return (
          <Button
            key={item.href}
            asChild
            variant="outline"
            className={cn(
              'rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900',
              active && 'border-stone-900 bg-stone-900 text-white hover:bg-stone-900 hover:text-white'
            )}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}
