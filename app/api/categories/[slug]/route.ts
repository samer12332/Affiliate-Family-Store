import { connectDB } from '@/lib/db';
import { Category } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

const CATEGORY_FALLBACKS: Record<string, { name: string; slug: string; description: string }> = {
  clothes: {
    name: 'Clothes',
    slug: 'clothes',
    description: 'Browse our clothing collection.',
  },
  shoes: {
    name: 'Shoes',
    slug: 'shoes',
    description: 'Browse our shoes collection.',
  },
  others: {
    name: 'Others',
    slug: 'others',
    description: 'Browse our accessories and other products.',
  },
  accessories: {
    name: 'Others',
    slug: 'accessories',
    description: 'Browse our accessories and other products.',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;

    const category = await Category.findOne({ slug });

    if (!category) {
      const fallback = CATEGORY_FALLBACKS[slug];
      if (!fallback) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ category: fallback });
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('[v0] Category API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category' },
      { status: 500 }
    );
  }
}
