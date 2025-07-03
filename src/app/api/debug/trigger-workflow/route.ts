import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { sessionId, photoUrl, userPreferences, occasion } = body;

    if (!sessionId || !photoUrl || !userPreferences || !occasion) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['sessionId', 'photoUrl', 'userPreferences', 'occasion']
      }, { status: 400 });
    }

    console.log(`[Debug Trigger] Manually triggering workflow for session: ${sessionId}`);

    // Send event to Inngest
    const event = await inngest.send({
      name: "fashion/analysis.requested",
      data: {
        userId,
        sessionId,
        photoUrl,
        userPreferences,
        occasion,
        quality: 'high',
        constraints: body.constraints,
        textDescription: body.textDescription
      }
    });

    console.log(`[Debug Trigger] Event sent successfully:`, event);

    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      eventId: event.ids,
      sessionId,
      userId,
      debug: {
        expectedBlobKey: `fashion-results/${userId}/${sessionId}.json`,
        checkResultsUrl: `/api/fashion/results/${sessionId}`,
        debugBlobUrl: `/api/debug/blob/${sessionId}`,
        debugWorkflowUrl: `/api/debug/workflow/${sessionId}`
      }
    });

  } catch (error) {
    console.error('[Debug Trigger] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger workflow',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}