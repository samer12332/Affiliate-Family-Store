import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { backfillNotificationRetention, getNotificationExpiryDate } from '@/lib/notifications';
import { isValidObjectId } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    await backfillNotificationRetention(auth.user._id.toString());

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }
    const body = await request.json();
    const read = Boolean(body?.read);

    const notification = await Notification.findById(id);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    if (notification.userId.toString() !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    notification.read = read;
    notification.expiresAt = getNotificationExpiryDate(read);
    await notification.save();

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error('[v0] Notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}
