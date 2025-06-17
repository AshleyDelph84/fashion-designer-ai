import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // List all results for this user
    const prefix = `fashion-results/${userId}/`;
    const { blobs } = await list({ 
      prefix,
      token: BLOB_READ_WRITE_TOKEN 
    });

    if (!blobs || blobs.length === 0) {
      return NextResponse.json({
        success: true,
        history: [],
        total: 0,
        message: 'No outfit history found'
      });
    }

    // Fetch metadata for each result
    const historyPromises = blobs.map(async (blob) => {
      try {
        // Extract sessionId from blob pathname
        const sessionId = blob.pathname.replace(prefix, '').replace('.json', '');
        
        // Fetch the blob content to get metadata
        const response = await fetch(blob.url);
        if (!response.ok) {
          console.warn(`Failed to fetch blob ${blob.pathname}: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        // Return summary data for history view
        return {
          sessionId,
          timestamp: data.timestamp,
          occasion: data.occasion,
          analysisData: {
            bodyType: data.analysis?.body_analysis?.body_type,
            dominantColors: data.analysis?.color_analysis?.best_colors?.slice(0, 3),
            outfitCount: data.recommendations?.outfit_recommendations?.length || 0
          },
          originalPhoto: data.originalPhoto,
          // Include a preview of the first outfit
          previewOutfit: data.recommendations?.outfit_recommendations?.[0] || null,
          // Check if any visualizations were successfully generated
          hasVisualizations: data.visualizations?.some((v: { visualization?: unknown }) => v.visualization) || false
        };
      } catch (error) {
        console.error(`Error processing blob ${blob.pathname}:`, error);
        return null;
      }
    });

    const historyResults = await Promise.all(historyPromises);
    const validHistory = historyResults
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      history: validHistory,
      total: validHistory.length
    });

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}