import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!BLOB_TOKEN) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN not configured',
        hasToken: false
      }, { status: 500 });
    }
    
    // Simple test - create a small blob
    const testKey = `test/simple-${Date.now()}.txt`;
    const testContent = 'Hello from simple blob test';
    
    console.log('[Simple Blob Test] Creating blob:', testKey);
    
    const blob = await put(testKey, testContent, {
      access: 'public',
      contentType: 'text/plain',
      token: BLOB_TOKEN,
    });
    
    console.log('[Simple Blob Test] Blob created:', blob);
    
    // Try to read it back
    const blobInfo = await head(testKey, { token: BLOB_TOKEN });
    
    return NextResponse.json({
      success: true,
      created: {
        key: testKey,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size
      },
      verified: !!blobInfo,
      blobInfo
    });

  } catch (error) {
    console.error('[Simple Blob Test] Error:', error);
    return NextResponse.json(
      { 
        error: 'Blob test failed',
        message: error instanceof Error ? error.message : String(error),
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      },
      { status: 500 }
    );
  }
}