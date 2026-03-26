import { put } from '@vercel/blob';
import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return String(name || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await requireRole(request, ['owner', 'admin', 'submerchant', 'merchant']);
    if (!auth.ok) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const base64 = bytes.toString('base64');
      const mimeType = file.type || 'image/jpeg';

      // Fallback for environments without Blob configuration.
      // This keeps product creation working in local and production.
      return NextResponse.json({
        url: `data:${mimeType};base64,${base64}`,
      });
    }

    const pathname = `products/${auth.user._id.toString()}/${timestamp}-${safeName}`;
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('[v0] Product image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload product image' },
      { status: 500 }
    );
  }
}

