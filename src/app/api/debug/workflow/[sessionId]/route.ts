import { NextRequest, NextResponse } from 'next/server';
import { head, list } from '@vercel/blob';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    if (!BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    console.log(`[Debug API] Checking workflow status for session: ${sessionId}`);

    const debugInfo = {
      sessionId,
      timestamp: new Date().toISOString(),
      results: {
        exists: false,
        url: null as string | null,
        size: null as number | null,
        error: null as string | null
      },
      visualizations: {
        total: 0,
        successful: 0,
        failed: 0,
        files: [] as Array<{
          name: string;
          exists: boolean;
          size?: number;
          url?: string;
          error?: string;
        }>
      },
      summary: {
        workflow_status: 'unknown',
        estimated_progress: '0%',
        issues: [] as string[]
      }
    };

    // Check if results blob exists
    const resultsKey = `fashion-results/${sessionId.split('-')[0]}/${sessionId}.json`;
    console.log(`[Debug API] Checking results blob: ${resultsKey}`);
    
    try {
      const resultsBlob = await head(resultsKey, { token: BLOB_READ_WRITE_TOKEN });
      debugInfo.results.exists = true;
      debugInfo.results.url = resultsBlob.url;
      debugInfo.results.size = resultsBlob.size;
      console.log(`[Debug API] Results blob found: ${resultsBlob.url} (${resultsBlob.size} bytes)`);
    } catch (error) {
      debugInfo.results.error = error instanceof Error ? error.message : String(error);
      console.log(`[Debug API] Results blob not found: ${debugInfo.results.error}`);
    }

    // Check visualization files
    console.log(`[Debug API] Checking visualization files for session: ${sessionId}`);
    
    try {
      // List all blobs with the session prefix
      const { blobs } = await list({
        prefix: `fashion-visualizations/${sessionId}/`,
        token: BLOB_READ_WRITE_TOKEN
      });

      console.log(`[Debug API] Found ${blobs.length} visualization files`);

      // Check each expected visualization file (outfit-1.jpg, outfit-2.jpg, outfit-3.jpg)
      for (let i = 1; i <= 3; i++) {
        const fileName = `outfit-${i}.jpg`;
        const fullKey = `fashion-visualizations/${sessionId}/${fileName}`;
        
        const matchingBlob = blobs.find(blob => blob.pathname === fullKey);
        
        if (matchingBlob) {
          debugInfo.visualizations.files.push({
            name: fileName,
            exists: true,
            size: matchingBlob.size,
            url: matchingBlob.url
          });
          debugInfo.visualizations.successful++;
        } else {
          debugInfo.visualizations.files.push({
            name: fileName,
            exists: false,
            error: 'File not found'
          });
          debugInfo.visualizations.failed++;
        }
      }

      debugInfo.visualizations.total = debugInfo.visualizations.successful + debugInfo.visualizations.failed;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Debug API] Error listing visualization files:`, errorMessage);
      debugInfo.summary.issues.push(`Error checking visualizations: ${errorMessage}`);
    }

    // Determine workflow status and progress
    if (debugInfo.results.exists) {
      debugInfo.summary.workflow_status = 'completed';
      debugInfo.summary.estimated_progress = '100%';
      
      if (debugInfo.visualizations.successful === 0) {
        debugInfo.summary.issues.push('Workflow completed but no visualizations were generated');
      } else if (debugInfo.visualizations.failed > 0) {
        debugInfo.summary.issues.push(`${debugInfo.visualizations.failed} out of ${debugInfo.visualizations.total} visualizations failed`);
      }
    } else if (debugInfo.visualizations.successful > 0) {
      debugInfo.summary.workflow_status = 'in_progress';
      debugInfo.summary.estimated_progress = '75%';
      debugInfo.summary.issues.push('Visualizations found but results not saved yet');
    } else {
      debugInfo.summary.workflow_status = 'not_started_or_failed';
      debugInfo.summary.estimated_progress = '0%';
      debugInfo.summary.issues.push('No results or visualizations found - workflow may have failed or not started');
    }

    console.log(`[Debug API] Workflow status for ${sessionId}: ${debugInfo.summary.workflow_status}`);

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('[Debug API] Error checking workflow status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check workflow status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}