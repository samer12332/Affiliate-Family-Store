'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type NotificationItem = {
  _id: string;
  title: string;
  body?: string;
  href?: string;
  read?: boolean;
};

export function LiveNotificationToast() {
  const router = useRouter();
  const { token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (isLoading || !token) return;

    const markReadAndOpen = async (item: NotificationItem) => {
      try {
        if (!item.read) {
          await request(`/notifications/${item._id}`, {
            method: 'PATCH',
            body: JSON.stringify({ read: true }),
          });
        }
      } catch {
        // ignore transient errors and still navigate
      } finally {
        router.push(item.href || '/admin/notifications');
      }
    };

    const loadOnce = async () => {
      try {
        const data = await get('/notifications?limit=10&unreadOnly=true');
        const items: NotificationItem[] = Array.isArray(data?.notifications) ? data.notifications : [];
        const currentIds = new Set(items.map((item) => String(item?._id || '')).filter(Boolean));

        if (!initialized.current) {
          currentIds.forEach((id) => seenIds.current.add(id));
          initialized.current = true;
          return;
        }

        for (const item of items) {
          const id = String(item?._id || '');
          if (!id || seenIds.current.has(id)) continue;
          seenIds.current.add(id);

          toast(item.title || 'New notification', {
            description: item.body || 'Tap to open',
            action: {
              label: 'Open',
              onClick: () => {
                void markReadAndOpen(item);
              },
            },
          });
        }

        for (const id of Array.from(seenIds.current)) {
          if (!currentIds.has(id)) {
            seenIds.current.delete(id);
          }
        }
      } catch {
        // Ignore transient load failures until the next page reload.
      }
    };

    void loadOnce();
  }, [get, isLoading, request, router, token]);

  return null;
}
