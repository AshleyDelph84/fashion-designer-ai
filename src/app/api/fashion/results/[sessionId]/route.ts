import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { head } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session belongs to the user
    if (!sessionId.startsWith(userId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check if results exist in blob storage
    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    
    try {
      // Check if the blob exists
      const blobInfo = await head(blobKey, { token: BLOB_READ_WRITE_TOKEN });
      
      if (!blobInfo) {
        return NextResponse.json({ 
          success: false, 
          message: 'Processing in progress. Please wait...' 
        });
      }
      
      // Fetch the actual results using the blob URL
      const response = await fetch(blobInfo.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.status}`);
      }
      
      const resultsText = await response.text();
      
      // Validate and parse JSON with proper error handling
      if (!resultsText || resultsText.trim().length === 0) {
        throw new Error('Empty response from blob storage');
      }
      
      let results;
      try {
        results = JSON.parse(resultsText);
      } catch (parseError) {
        console.error(`[Results API] JSON parse error for session ${sessionId}:`, parseError);
        console.error(`[Results API] Raw response text (first 200 chars):`, resultsText.substring(0, 200));
        throw new Error(`Invalid JSON data in results: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Validate the parsed results structure
      if (!results || typeof results !== 'object') {
        throw new Error('Results data is not a valid object');
      }

      return NextResponse.json({
        success: true,
        data: results,
      });

    } catch (blobError) {
      // Blob doesn't exist yet - workflow might still be processing
      console.log(`Results not ready for session ${sessionId}:`, blobError);
      
      return NextResponse.json({
        success: false,
        message: 'Your fashion analysis is still processing. Please wait a moment and refresh...',
      });
    }

  } catch (error) {
    console.error('Results fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}