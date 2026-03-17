import { requireAuth, sanitizeUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  await connectDB();
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({
    user: {
      id: auth.user._id,
      ...sanitizeUser(auth.user),
    },
  });
}
