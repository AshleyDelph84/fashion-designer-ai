import { NextRequest, NextResponse } from 'next/server';
import { head, list } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';

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

    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ 
        error: 'No blob token configured',
        tokens_checked: {
          BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
        }
      }, { status: 500 });
    }

    // The expected blob key for this session
    const expectedBlobKey = `fashion-results/${userId}/${sessionId}.json`;
    
    console.log(`[Blob Status] Checking status for session: ${sessionId}`);
    console.log(`[Blob Status] Expected blob key: ${expectedBlobKey}`);
    console.log(`[Blob Status] User ID: ${userId}`);
    
    // Try to check if the blob exists
    let blobExists = false;
    let blobInfo = null;
    let headError = null;
    
    try {
      blobInfo = await head(expectedBlobKey, { token: BLOB_READ_WRITE_TOKEN });
      blobExists = !!blobInfo;
      console.log(`[Blob Status] Blob head result:`, blobInfo);
    } catch (error) {
      headError = error instanceof Error ? error.message : String(error);
      console.log(`[Blob Status] Blob head error:`, headError);
    }
    
    // List all blobs for this user
    let userBlobs = [];
    let listError = null;
    
    try {
      const { blobs } = await list({
        prefix: `fashion-results/${userId}/`,
        token: BLOB_READ_WRITE_TOKEN,
        limit: 20
      });
      userBlobs = blobs;
      console.log(`[Blob Status] Found ${blobs.length} blobs for user ${userId}`);
    } catch (error) {
      listError = error instanceof Error ? error.message : String(error);
      console.log(`[Blob Status] List error:`, listError);
    }
    
    // Also check for any fashion-results blobs
    let allFashionBlobs = [];
    try {
      const { blobs } = await list({
        prefix: 'fashion-results/',
        token: BLOB_READ_WRITE_TOKEN,
        limit: 10
      });
      allFashionBlobs = blobs;
      console.log(`[Blob Status] Found ${blobs.length} total fashion-results blobs`);
    } catch (error) {
      console.log(`[Blob Status] Failed to list all fashion blobs:`, error);
    }

    return NextResponse.json({
      sessionId,
      userId,
      expectedBlobKey,
      blobExists,
      blobInfo,
      headError,
      userBlobs: userBlobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
        url: b.url
      })),
      listError,
      allFashionBlobsCount: allFashionBlobs.length,
      recentFashionBlobs: allFashionBlobs.slice(0, 5).map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt
      })),
      tokenUsed: 'BLOB_READ_WRITE_TOKEN',
      debug: {
        sessionStartsWithUserId: sessionId.startsWith(userId),
        expectedPath: `fashion-results/${userId}/${sessionId}.json`
      }
    });

  } catch (error) {
    console.error('[Blob Status] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check blob status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}