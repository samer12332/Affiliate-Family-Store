import { Notification, User } from '@/lib/models';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const READ_NOTIFICATION_RETENTION_DAYS = 7;
const UNREAD_NOTIFICATION_RETENTION_DAYS = 14;

export function getNotificationExpiryDate(read: boolean, baseDate = new Date()) {
  const retentionDays = read ? READ_NOTIFICATION_RETENTION_DAYS : UNREAD_NOTIFICATION_RETENTION_DAYS;
  return new Date(baseDate.getTime() + retentionDays * DAY_IN_MS);
}

export async function backfillNotificationRetention(userId?: string) {
  const now = new Date();
  const filter = userId ? { userId } : {};

  await Notification.deleteMany({
    ...filter,
    $or: [
      {
        read: true,
        createdAt: { $lte: new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * DAY_IN_MS) },
      },
      {
        read: false,
        createdAt: { $lte: new Date(now.getTime() - UNREAD_NOTIFICATION_RETENTION_DAYS * DAY_IN_MS) },
      },
    ],
  });

  await Notification.updateMany(
    { ...filter, read: true, expiresAt: null },
    [
      {
        $set: {
          expiresAt: {
            $dateAdd: {
              startDate: '$createdAt',
              unit: 'day',
              amount: READ_NOTIFICATION_RETENTION_DAYS,
            },
          },
        },
      },
    ]
  );

  await Notification.updateMany(
    { ...filter, read: false, expiresAt: null },
    [
      {
        $set: {
          expiresAt: {
            $dateAdd: {
              startDate: '$createdAt',
              unit: 'day',
              amount: UNREAD_NOTIFICATION_RETENTION_DAYS,
            },
          },
        },
      },
    ]
  );
}

export async function getAdminUserIds(): Promise<string[]> {
  const ids = await User.find({
    role: { $in: ['owner', 'admin'] },
    active: true,
  }).distinct('_id');
  return ids.map((id: any) => id?.toString?.() || String(id));
}

export async function createNotificationsForUsers(input: {
  userIds: Array<string | null | undefined>;
  type?: string;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, any>;
}) {
  const uniqueUserIds = Array.from(
    new Set(
      input.userIds
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );
  if (uniqueUserIds.length === 0) return;

  await Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      userId,
      type: input.type || 'info',
      title: input.title,
      body: input.body || '',
      href: input.href || '',
      metadata: input.metadata || {},
      read: false,
      expiresAt: getNotificationExpiryDate(false),
    }))
  );
}

