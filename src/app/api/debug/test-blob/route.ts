import { NextRequest, NextResponse } from 'next/server';
import { head, list, put } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    // Check env var
    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    
    console.log('[Test Blob] Environment check:');
    console.log('- BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
    if (!BLOB_TOKEN) {
      return NextResponse.json({ 
        error: 'No blob token configured',
        env_check: {
          BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
        }
      }, { status: 500 });
    }

    // Test creating and reading a blob
    const testKey = `test/blob-${Date.now()}.json`;
    const testData = { test: true, timestamp: new Date().toISOString() };
    
    console.log(`[Test Blob] Creating test blob with key: ${testKey}`);
    console.log(`[Test Blob] Token length: ${BLOB_TOKEN.length}`);
    
    // Create test blob
    const createdBlob = await put(testKey, JSON.stringify(testData), {
      access: 'public',
      contentType: 'application/json',
      token: BLOB_TOKEN,
    });
    
    console.log(`[Test Blob] Created blob at: ${createdBlob.url}`);
    console.log(`[Test Blob] Blob details:`, createdBlob);
    
    // Try to read it back
    const blobInfo = await head(testKey, { token: BLOB_TOKEN });
    
    console.log(`[Test Blob] Read blob info:`, blobInfo);
    
    // List all fashion-results blobs
    let fashionResults: any[] = [];
    try {
      const listResult = await list({
        prefix: 'fashion-results/',
        token: BLOB_TOKEN,
        limit: 10
      });
      fashionResults = listResult.blobs || [];
      console.log(`[Test Blob] Found ${fashionResults.length} fashion-results blobs`);
    } catch (listError) {
      console.error('[Test Blob] List error:', listError);
    }
    
    // Also test the specific session pattern
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    let sessionBlobExists = false;
    if (sessionId) {
      const userId = sessionId.split('-')[0];
      const sessionBlobKey = `fashion-results/${userId}/${sessionId}.json`;
      try {
        const sessionInfo = await head(sessionBlobKey, { token: BLOB_TOKEN });
        sessionBlobExists = !!sessionInfo;
        console.log(`[Test Blob] Session blob ${sessionBlobKey} exists:`, sessionBlobExists);
      } catch (e) {
        console.log(`[Test Blob] Session blob ${sessionBlobKey} not found`);
      }
    }

    return NextResponse.json({
      success: true,
      test: {
        created: createdBlob.url,
        verified: !!blobInfo,
        blobInfo,
        createdBlobDetails: createdBlob
      },
      fashionResults: fashionResults.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt
      })),
      sessionCheck: sessionId ? {
        sessionId,
        expectedKey: `fashion-results/${sessionId.split('-')[0]}/${sessionId}.json`,
        exists: sessionBlobExists
      } : null,
      tokenUsed: 'BLOB_READ_WRITE_TOKEN',
      tokenLength: BLOB_TOKEN.length
    });

  } catch (error) {
    console.error('[Test Blob] Error:', error);
    console.error('[Test Blob] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        env_check: {
          BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
        }
      },
      { status: 500 }
    );
  }
}