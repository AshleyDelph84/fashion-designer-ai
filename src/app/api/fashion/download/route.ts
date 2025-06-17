import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, outfitIndex, imageUrl, outfitName } = body;

    if (!sessionId || outfitIndex === undefined || !imageUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId, outfitIndex, imageUrl' 
      }, { status: 400 });
    }

    // Verify the session belongs to the user
    if (!sessionId.startsWith(userId)) {
      return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
    }

    try {
      // Fetch the image from the blob storage URL
      console.log(`[Download API] Fetching image for download: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Generate a descriptive filename
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedOutfitName = (outfitName || `Outfit-${outfitIndex + 1}`)
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      
      const filename = `${sanitizedOutfitName}-${timestamp}-HD.jpg`;

      console.log(`[Download API] Sending image download: ${filename}, size: ${imageBuffer.byteLength} bytes`);

      // Return the image as a downloadable response
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': imageBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });

    } catch (fetchError) {
      console.error(`[Download API] Error fetching image:`, fetchError);
      return NextResponse.json({ 
        error: `Failed to fetch image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Download API] General error:', error);
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    );
  }
}