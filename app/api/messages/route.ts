import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { type, name, email, phone, message, productId } = body;

    if (!type || !name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['contact', 'productInquiry'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      );
    }

    const msg = new Message({
      type,
      name,
      email,
      phone: phone || '',
      message,
      productId: productId || null,
    });

    await msg.save();

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[v0] Message creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: any = {};
    if (type && ['contact', 'productInquiry'].includes(type)) {
      query.type = type;
    }

    const messages = await Message.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Message.countDocuments(query);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[v0] Messages API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
