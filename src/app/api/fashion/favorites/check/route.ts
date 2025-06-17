import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { head } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, outfitIndex } = body;

    if (!sessionId || outfitIndex === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId, outfitIndex' 
      }, { status: 400 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check favorites
    const favoritesKey = `fashion-favorites/${userId}/favorites.json`;
    
    try {
      const blobInfo = await head(favoritesKey, { token: BLOB_READ_WRITE_TOKEN });
      
      if (!blobInfo) {
        return NextResponse.json({
          success: true,
          isFavorited: false
        });
      }
      
      const response = await fetch(blobInfo.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }
      
      const favoritesData = await response.json();
      const isFavorited = favoritesData.favorites?.some(
        (f: { sessionId: string; outfitIndex: number }) => 
          f.sessionId === sessionId && f.outfitIndex === outfitIndex
      ) || false;

      return NextResponse.json({
        success: true,
        isFavorited
      });

    } catch {
      return NextResponse.json({
        success: true,
        isFavorited: false
      });
    }

  } catch (error) {
    console.error('Favorites check error:', error);
    return NextResponse.json(
      { error: 'Failed to check favorites' },
      { status: 500 }
    );
  }
}