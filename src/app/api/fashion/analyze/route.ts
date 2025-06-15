import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { photoFile, occasion, constraints, userPreferences } = body;

    if (!photoFile || !occasion || !userPreferences) {
      return NextResponse.json({ 
        error: 'Missing required fields: photoFile, occasion, userPreferences' 
      }, { status: 400 });
    }

    // Convert base64 photo to blob and upload
    const photoBuffer = Buffer.from(photoFile.split(',')[1], 'base64');
    const sessionId = `${userId}-${Date.now()}`;
    const photoBlob = await put(`fashion-uploads/${sessionId}.jpg`, photoBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    // Trigger the Inngest fashion analysis workflow
    const workflowResult = await inngest.send({
      name: 'fashion/analysis.requested',
      data: {
        userId,
        sessionId,
        photoUrl: photoBlob.url,
        userPreferences,
        occasion,
        constraints: constraints || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId,
      workflowId: workflowResult.ids[0],
      message: 'Fashion analysis started',
    });

  } catch (error) {
    console.error('Fashion analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to start fashion analysis' },
      { status: 500 }
    );
  }
}