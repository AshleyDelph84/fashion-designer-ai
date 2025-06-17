import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put, head } from '@vercel/blob';

interface FavoriteOutfit {
  sessionId: string;
  outfitIndex: number;
  outfitName: string;
  outfitData: Record<string, unknown>;
  savedAt: string;
  originalPhoto: string;
  occasion: string;
  visualization?: {
    image_url: string;
  };
}

interface FavoritesData {
  userId: string;
  favorites: FavoriteOutfit[];
  updatedAt: string;
}

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

    // Check if favorites exist
    const favoritesKey = `fashion-favorites/${userId}/favorites.json`;
    
    try {
      const blobInfo = await head(favoritesKey, { token: BLOB_READ_WRITE_TOKEN });
      
      if (!blobInfo) {
        return NextResponse.json({
          success: true,
          favorites: [],
          total: 0
        });
      }
      
      // Fetch the favorites data
      const response = await fetch(blobInfo.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }
      
      const favoritesData: FavoritesData = await response.json();

      return NextResponse.json({
        success: true,
        favorites: favoritesData.favorites || [],
        total: favoritesData.favorites?.length || 0
      });

    } catch {
      // Favorites don't exist yet
      console.log(`No favorites found for user ${userId}`);
      
      return NextResponse.json({
        success: true,
        favorites: [],
        total: 0
      });
    }

  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, outfitIndex, action } = body;

    if (!sessionId || outfitIndex === undefined || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId, outfitIndex, action' 
      }, { status: 400 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // First, get the outfit data from the results
    const resultsKey = `fashion-results/${userId}/${sessionId}.json`;
    
    try {
      const resultsBlobInfo = await head(resultsKey, { token: BLOB_READ_WRITE_TOKEN });
      if (!resultsBlobInfo) {
        return NextResponse.json({ error: 'Session results not found' }, { status: 404 });
      }
      
      const resultsResponse = await fetch(resultsBlobInfo.url);
      if (!resultsResponse.ok) {
        throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
      }
      
      const resultsData = await resultsResponse.json();
      const outfitRecommendations = resultsData.recommendations?.outfit_recommendations;
      
      if (!outfitRecommendations || !outfitRecommendations[outfitIndex]) {
        return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });
      }
      
      const outfit = outfitRecommendations[outfitIndex];
      const visualization = resultsData.visualizations?.find((v: { outfit_name: string }) => 
        v.outfit_name === outfit.name || v.outfit_name === `Outfit ${outfitIndex + 1}`
      );

      // Get existing favorites
      const favoritesKey = `fashion-favorites/${userId}/favorites.json`;
      let favoritesData: FavoritesData = {
        userId,
        favorites: [],
        updatedAt: new Date().toISOString()
      };

      try {
        const favoritesBlobInfo = await head(favoritesKey, { token: BLOB_READ_WRITE_TOKEN });
        if (favoritesBlobInfo) {
          const favoritesResponse = await fetch(favoritesBlobInfo.url);
          if (favoritesResponse.ok) {
            favoritesData = await favoritesResponse.json();
          }
        }
      } catch {
        console.log('No existing favorites found, creating new');
      }

      // const favoriteId = `${sessionId}-${outfitIndex}`;
      const existingIndex = favoritesData.favorites.findIndex(
        f => f.sessionId === sessionId && f.outfitIndex === outfitIndex
      );

      if (action === 'add') {
        if (existingIndex === -1) {
          const newFavorite: FavoriteOutfit = {
            sessionId,
            outfitIndex,
            outfitName: outfit.name,
            outfitData: outfit,
            savedAt: new Date().toISOString(),
            originalPhoto: resultsData.originalPhoto,
            occasion: resultsData.occasion,
            visualization: visualization?.visualization
          };
          favoritesData.favorites.push(newFavorite);
        }
      } else if (action === 'remove') {
        if (existingIndex !== -1) {
          favoritesData.favorites.splice(existingIndex, 1);
        }
      }

      favoritesData.updatedAt = new Date().toISOString();

      // Save updated favorites
      await put(favoritesKey, JSON.stringify(favoritesData, null, 2), {
        access: "public",
        contentType: "application/json",
        token: BLOB_READ_WRITE_TOKEN,
        allowOverwrite: true,
      });

      return NextResponse.json({
        success: true,
        action,
        isFavorited: action === 'add',
        totalFavorites: favoritesData.favorites.length
      });

    } catch (error) {
      console.error('Error processing favorite:', error);
      return NextResponse.json({ error: 'Failed to process favorite' }, { status: 500 });
    }

  } catch (error) {
    console.error('Favorites API error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorites' },
      { status: 500 }
    );
  }
}