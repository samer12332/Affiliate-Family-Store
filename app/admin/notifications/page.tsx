'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotificationsPage() {
  const router = useRouter();
  const { admin, token, isLoading } = useAdminAuth();
  const { get, request } = useApi();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loadingItems, setLoadingItems] = useState(true);

  const localizeNotificationText = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const direct = t(text);
    if (direct !== text) {
      return direct;
    }

    let match = text.match(/^New order\s+(.+)$/i);
    if (match) {
      return `${t('New order')} ${match[1]}`;
    }

    match = text.match(/^Order\s+(.+)\s+updated$/i);
    if (match) {
      return `${t('Order')} ${match[1]} ${t('updated')}`;
    }

    match = text.match(/^Status changed to\s+([a-z_]+)\.?$/i);
    if (match) {
      return `${t('Status changed to')} ${t(String(match[1]).toLowerCase())}.`;
    }

    match = text.match(/^A new order was submitted by marketer\s+(.+)\.$/i);
    if (match) {
      return `${t('A new order was submitted by marketer')} ${match[1]}.`;
    }

    match = text.match(/^New commission complaint on\s+(.+)$/i);
    if (match) {
      return `${t('New commission complaint on')} ${match[1]}`;
    }

    match = text.match(/^Channel:\s+(.+)\.\s+Complainant role:\s+([a-z_]+)\.$/i);
    if (match) {
      const channelRaw = String(match[1]).trim();
      const roleRaw = String(match[2]).trim().toLowerCase();
      return `${t('Channel')}: ${t(channelRaw)}. ${t('Complainant role')}: ${t(roleRaw)}.`;
    }

    match = text.match(/^(.+)\s+channel was marked\s+(paid|received)\.$/i);
    if (match) {
      const channelRaw = String(match[1]).trim();
      const actionRaw = String(match[2]).trim().toLowerCase();
      return `${t(channelRaw)} ${t('channel was marked')} ${t(actionRaw)}.`;
    }

    return text;
  };

  const formatNotificationDateTime = (value: unknown) => {
    const date = new Date(String(value || ''));
    if (Number.isNaN(date.getTime())) return '';
    const localeCode = locale === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.DateTimeFormat(localeCode, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const load = async () => {
    try {
      setLoadingItems(true);
      const data = await get('/notifications?limit=100');
      setItems(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadTotal(Number(data?.unreadTotal || 0));
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    load();
  }, [get, isLoading, router, token]);

  if (isLoading || !token || !admin) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('Notifications')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('Unread')}: {unreadTotal}</p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <div className="w-full min-w-0 sm:w-auto">
              <Button
                variant="outline"
                className="w-full min-w-0 whitespace-normal break-words text-center sm:w-auto"
                onClick={async () => {
                  await request('/notifications', {
                    method: 'PATCH',
                    body: JSON.stringify({ action: 'read_all' }),
                  });
                  await load();
                }}
              >
                {t('Mark all read')}
              </Button>
            </div>
            <Link href="/admin/dashboard" className="w-full min-w-0 sm:w-auto">
              <Button variant="outline" className="w-full min-w-0 whitespace-normal break-words text-center sm:w-auto">{t('Back to dashboard')}</Button>
            </Link>
          </div>
        </div>

        <Card className="min-w-0 rounded-3xl border-stone-200 p-6">
          {loadingItems ? (
            <p className="text-sm text-muted-foreground">{t('Loading notifications...')}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No notifications yet.')}</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    item.read ? 'border-stone-200 bg-white' : 'border-blue-200 bg-blue-50/60'
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-words font-medium text-foreground">{localizeNotificationText(item.title)}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatNotificationDateTime(item.createdAt)}</span>
                      {!item.read && <span className="text-xs font-semibold text-blue-700">{t('New')}</span>}
                    </div>
                  </div>
                  {item.body && <p className="mt-1 break-words text-sm text-muted-foreground">{localizeNotificationText(item.body)}</p>}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        if (!item.read) {
                          await request(`/notifications/${item._id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ read: true }),
                          });
                        }
                        router.push(item.href || '/admin/dashboard');
                      }}
                    >
                      {t('Open')}
                    </Button>
                    {!item.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          await request(`/notifications/${item._id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ read: true }),
                          });
                          await load();
                        }}
                      >
                        {t('Mark as read')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
