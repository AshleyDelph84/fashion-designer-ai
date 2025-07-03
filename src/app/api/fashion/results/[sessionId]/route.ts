import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { head } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  console.log(`[Results API] Fetching results for sessionId: ${sessionId}`);
  
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      console.log('[Results API] Unauthorized request - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[Results API] Authenticated userId: ${userId}`);

    // Verify the session belongs to the user
    if (!sessionId.startsWith(userId)) {
      console.log(`[Results API] Session ${sessionId} does not belong to user ${userId}`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || process.env.NEWSLETTER_READ_WRITE_TOKEN;
    console.log('[Results API] Blob token check:', {
      BLOB_READ_WRITE_TOKEN_exists: !!process.env.BLOB_READ_WRITE_TOKEN,
      NEWSLETTER_READ_WRITE_TOKEN_exists: !!process.env.NEWSLETTER_READ_WRITE_TOKEN,
      token_configured: !!BLOB_READ_WRITE_TOKEN
    });
    
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('[Results API] No blob token found! Please set either BLOB_READ_WRITE_TOKEN or NEWSLETTER_READ_WRITE_TOKEN');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check if results exist in blob storage
    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    console.log(`[Results API] Checking blob with key: ${blobKey}`);
    
    try {
      // Check if the blob exists
      const blobInfo = await head(blobKey, { token: BLOB_READ_WRITE_TOKEN });
      
      if (!blobInfo) {
        console.log(`[Results API] Blob head returned null for key: ${blobKey}`);
        return NextResponse.json({ 
          success: false, 
          message: 'Processing in progress. Please wait...' 
        });
      }
      
      console.log(`[Results API] Blob found at: ${blobInfo.url}, size: ${blobInfo.size} bytes`);
      
      // Fetch the actual results using the blob URL
      const response = await fetch(blobInfo.url);
      if (!response.ok) {
        console.error(`[Results API] Failed to fetch blob content. Status: ${response.status}`);
        throw new Error(`Failed to fetch blob: ${response.status}`);
      }
      
      const resultsText = await response.text();
      console.log(`[Results API] Fetched blob content, length: ${resultsText.length} characters`);
      
      // Validate and parse JSON with proper error handling
      if (!resultsText || resultsText.trim().length === 0) {
        console.error('[Results API] Empty response from blob storage');
        throw new Error('Empty response from blob storage');
      }
      
      let results;
      try {
        results = JSON.parse(resultsText);
        console.log('[Results API] Successfully parsed JSON results');
      } catch (parseError) {
        console.error(`[Results API] JSON parse error for session ${sessionId}:`, parseError);
        console.error(`[Results API] Raw response text (first 200 chars):`, resultsText.substring(0, 200));
        throw new Error(`Invalid JSON data in results: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Validate the parsed results structure
      if (!results || typeof results !== 'object') {
        console.error('[Results API] Results data is not a valid object');
        throw new Error('Results data is not a valid object');
      }

      console.log(`[Results API] Returning results for session ${sessionId}`);
      return NextResponse.json({
        success: true,
        data: results,
      });

    } catch (blobError) {
      // Blob doesn't exist yet - workflow might still be processing
      const errorMessage = blobError instanceof Error ? blobError.message : String(blobError);
      console.log(`[Results API] Blob not found or error for session ${sessionId}:`, errorMessage);
      console.log(`[Results API] Blob key attempted: ${blobKey}`);
      
      return NextResponse.json({
        success: false,
        message: 'Your fashion analysis is still processing. Please wait a moment and refresh...',
        debug: {
          sessionId,
          blobKey,
          error: errorMessage
        }
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