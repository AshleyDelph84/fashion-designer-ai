import { NextRequest, NextResponse } from 'next/server';
import { put, head, list } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!BLOB_TOKEN) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not configured',
        hasToken: false
      }, { status: 500 });
    }
    
    // Test creating a fashion results blob
    const sessionId = `${userId}-test-${Date.now()}`;
    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    const testData = {
      userId,
      sessionId,
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test fashion result'
    };
    
    console.log('[Test Fashion Blob] Creating blob:', blobKey);
    
    const blob = await put(blobKey, JSON.stringify(testData, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token: BLOB_TOKEN,
      allowOverwrite: true,
    });
    
    console.log('[Test Fashion Blob] Blob created:', blob);
    
    // Try to read it back
    const blobInfo = await head(blobKey, { token: BLOB_TOKEN });
    
    // List fashion results for this user
    const { blobs } = await list({
      prefix: `fashion-results/${userId}/`,
      token: BLOB_TOKEN,
      limit: 10
    });
    
    return NextResponse.json({
      success: true,
      created: {
        key: blobKey,
        url: blob.url,
        sessionId,
        blobDetails: blob
      },
      verified: !!blobInfo,
      blobInfo,
      userFashionResults: blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
        url: b.url
      }))
    });

  } catch (error) {
    console.error('[Test Fashion Blob] Error:', error);
    return NextResponse.json(
      { 
        error: 'Fashion blob test failed',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      },
      { status: 500 }
    );
  }
}