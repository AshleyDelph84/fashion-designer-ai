import { NextRequest, NextResponse } from 'next/server';
import { head, list } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log(`[Debug Blob API] Checking blobs for session: ${sessionId}`);
    console.log(`[Debug Blob API] User ID: ${userId}`);

    const debugInfo = {
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      expectedBlobKey: `fashion-results/${userId}/${sessionId}.json`,
      blobExists: false,
      blobInfo: null as any,
      allUserBlobs: [] as any[],
      visualizationBlobs: [] as any[],
      summary: {
        totalUserBlobs: 0,
        totalVisualizationBlobs: 0,
        resultsBlobFound: false
      }
    };

    // Check if the specific results blob exists
    try {
      const blobInfo = await head(debugInfo.expectedBlobKey, { token: BLOB_READ_WRITE_TOKEN });
      if (blobInfo) {
        debugInfo.blobExists = true;
        debugInfo.blobInfo = {
          url: blobInfo.url,
          size: blobInfo.size,
          uploadedAt: blobInfo.uploadedAt,
          pathname: blobInfo.pathname
        };
        debugInfo.summary.resultsBlobFound = true;
        console.log(`[Debug Blob API] Results blob found: ${blobInfo.url}`);
      }
    } catch (error) {
      console.log(`[Debug Blob API] Results blob not found: ${error instanceof Error ? error.message : String(error)}`);
    }

    // List all blobs for this user's fashion results
    try {
      const { blobs: userBlobs } = await list({
        prefix: `fashion-results/${userId}/`,
        token: BLOB_READ_WRITE_TOKEN,
        limit: 100
      });

      debugInfo.allUserBlobs = userBlobs.map(blob => ({
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }));
      debugInfo.summary.totalUserBlobs = userBlobs.length;
      console.log(`[Debug Blob API] Found ${userBlobs.length} blobs for user ${userId}`);
    } catch (error) {
      console.error(`[Debug Blob API] Error listing user blobs:`, error);
    }

    // List visualization blobs for this session
    try {
      const { blobs: vizBlobs } = await list({
        prefix: `fashion-visualizations/${sessionId}/`,
        token: BLOB_READ_WRITE_TOKEN,
        limit: 100
      });

      debugInfo.visualizationBlobs = vizBlobs.map(blob => ({
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }));
      debugInfo.summary.totalVisualizationBlobs = vizBlobs.length;
      console.log(`[Debug Blob API] Found ${vizBlobs.length} visualization blobs for session ${sessionId}`);
    } catch (error) {
      console.error(`[Debug Blob API] Error listing visualization blobs:`, error);
    }

    // Provide recommendations based on findings
    const recommendations = [];
    if (!debugInfo.blobExists) {
      recommendations.push('Results blob not found - workflow may still be processing or failed');
      
      if (debugInfo.summary.totalUserBlobs === 0) {
        recommendations.push('No blobs found for this user - workflow may not have started');
      } else {
        recommendations.push(`Found ${debugInfo.summary.totalUserBlobs} other blobs for this user`);
      }
    }

    if (debugInfo.summary.totalVisualizationBlobs > 0 && !debugInfo.blobExists) {
      recommendations.push('Visualizations exist but results not saved - possible workflow error at save step');
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations
    });

  } catch (error) {
    console.error('[Debug Blob API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check blob status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}