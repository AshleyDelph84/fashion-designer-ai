import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId query parameter required' }, { status: 400 });
    }

    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'No blob token configured' }, { status: 500 });
    }

    // Extract userId from sessionId
    const parts = sessionId.split('-');
    const userId = parts.slice(0, -1).join('-'); // Everything except the last part (timestamp)
    
    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    console.log(`[Check Session] Checking blob key: ${blobKey}`);
    
    try {
      const blobInfo = await head(blobKey, { token: BLOB_READ_WRITE_TOKEN });
      
      if (blobInfo) {
        // Fetch the content
        const response = await fetch(blobInfo.url);
        const content = await response.json();
        
        return NextResponse.json({
          success: true,
          found: true,
          sessionId,
          userId,
          blobKey,
          blobInfo: {
            url: blobInfo.url,
            size: blobInfo.size,
            uploadedAt: blobInfo.uploadedAt
          },
          hasResults: !!content,
          resultsPreview: {
            hasAnalysis: !!content.analysis,
            hasRecommendations: !!content.recommendations,
            visualizationsCount: content.visualizations?.length || 0,
            timestamp: content.timestamp
          }
        });
      }
    } catch (error) {
      console.log(`[Check Session] Blob not found: ${error instanceof Error ? error.message : String(error)}`);
      
      return NextResponse.json({
        success: true,
        found: false,
        sessionId,
        userId,
        blobKey,
        error: 'Blob not found - workflow may still be processing'
      });
    }

  } catch (error) {
    console.error('[Check Session] Error:', error);
    return NextResponse.json(
      { 
        error: 'Check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}