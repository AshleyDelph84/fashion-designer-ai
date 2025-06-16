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
    const { photoFile, occasion, constraints, userPreferences, textDescription } = body;

    if (!photoFile || !occasion || !userPreferences) {
      return NextResponse.json({ 
        error: 'Missing required fields: photoFile, occasion, userPreferences' 
      }, { status: 400 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Convert base64 photo to blob and upload
    const photoBuffer = Buffer.from(photoFile.split(',')[1], 'base64');
    const sessionId = `${userId}-${Date.now()}`;
    console.log(`[Fashion API] Uploading photo for session ${sessionId}`);
    
    const photoBlob = await put(`fashion-uploads/${sessionId}.jpg`, photoBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
      token: BLOB_READ_WRITE_TOKEN,
    });
    
    console.log(`[Fashion API] Photo uploaded successfully: ${photoBlob.url}`);

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
        textDescription: textDescription || undefined,
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