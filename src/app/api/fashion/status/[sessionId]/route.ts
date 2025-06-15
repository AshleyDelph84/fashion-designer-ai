import { NextRequest, NextResponse } from 'next/server';
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

    
    // Verify the session belongs to the user
    if (!sessionId.startsWith(userId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // In a real implementation, you would check the Inngest status
    // For now, we'll simulate the status checking
    // This would integrate with Inngest's status API or check blob storage

    try {
      // Try to fetch results from blob storage
      const resultsUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/fashion/results/${sessionId}`;
      const resultsResponse = await fetch(resultsUrl);
      
      if (resultsResponse.ok) {
        const results = await resultsResponse.json();
        return NextResponse.json({
          status: 'completed',
          sessionId,
          results,
        });
      } else {
        return NextResponse.json({
          status: 'processing',
          sessionId,
          message: 'Analysis in progress...',
        });
      }
    } catch {
      return NextResponse.json({
        status: 'processing',
        sessionId,
        message: 'Analysis in progress...',
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}