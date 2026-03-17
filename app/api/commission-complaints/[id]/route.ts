import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { CommissionComplaint } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const status = String(body?.status || '').trim();
    const resolutionNote = String(body?.resolutionNote || '').trim();
    if (!['open', 'in_review', 'resolved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid complaint status' }, { status: 400 });
    }

    const complaint = await CommissionComplaint.findById(id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    complaint.status = status;
    complaint.reviewedByUserId = auth.user._id;
    complaint.reviewedAt = new Date();
    complaint.resolutionNote = resolutionNote;
    await complaint.save();

    return NextResponse.json({ complaint });
  } catch (error: any) {
    console.error('[v0] Commission complaint update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update complaint' },
      { status: 500 }
    );
  }
}
