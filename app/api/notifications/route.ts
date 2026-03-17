import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Notification } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const skip = (page - 1) * limit;

    const query: any = { userId: auth.user._id };
    if (unreadOnly) query.read = false;

    const [notifications, total, unreadTotal] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: auth.user._id, read: false }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      unreadTotal,
      pagination: {
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error('[v0] Notifications list API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const action = String(body?.action || '');
    if (action !== 'read_all') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await Notification.updateMany(
      { userId: auth.user._id, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Notifications update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
