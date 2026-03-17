import { Notification, User } from '@/lib/models';

export async function getAdminUserIds(): Promise<string[]> {
  const ids = await User.find({
    role: { $in: ['owner', 'admin', 'super_admin'] },
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
    }))
  );
}
