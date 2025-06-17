import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { del, list } from '@vercel/blob';

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Missing required field: sessionId' 
      }, { status: 400 });
    }

    // Verify the session belongs to the user
    if (!sessionId.startsWith(userId)) {
      return NextResponse.json({ error: 'Unauthorized access to session' }, { status: 403 });
    }

    // Get the blob storage token
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const deletedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // List all files related to this session
      const prefix = `fashion-`;
      const { blobs } = await list({ 
        prefix,
        token: BLOB_READ_WRITE_TOKEN 
      });

      // Filter files related to this specific session
      const sessionFiles = blobs.filter(blob => 
        blob.pathname.includes(sessionId)
      );

      console.log(`[Delete API] Found ${sessionFiles.length} files for session ${sessionId}`);

      // Delete each file
      for (const file of sessionFiles) {
        try {
          await del(file.url, { token: BLOB_READ_WRITE_TOKEN });
          deletedFiles.push(file.pathname);
          console.log(`[Delete API] Deleted: ${file.pathname}`);
        } catch (deleteError) {
          const errorMessage = `Failed to delete ${file.pathname}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`;
          errors.push(errorMessage);
          console.error(`[Delete API] ${errorMessage}`);
        }
      }

      // Also try to remove from favorites if it exists
      try {
        const favoritesKey = `fashion-favorites/${userId}/favorites.json`;
        const favoritesBlobs = await list({ 
          prefix: 'fashion-favorites',
          token: BLOB_READ_WRITE_TOKEN 
        });
        
        const userFavoritesFile = favoritesBlobs.blobs.find(blob => 
          blob.pathname === favoritesKey
        );

        if (userFavoritesFile) {
          // Fetch current favorites
          const response = await fetch(userFavoritesFile.url);
          if (response.ok) {
            const favoritesData = await response.json();
            
            // Remove any favorites related to this session
            const updatedFavorites = favoritesData.favorites?.filter(
              (fav: { sessionId: string }) => fav.sessionId !== sessionId
            ) || [];

            // Update favorites file
            const { put } = await import('@vercel/blob');
            await put(favoritesKey, JSON.stringify({
              ...favoritesData,
              favorites: updatedFavorites,
              updatedAt: new Date().toISOString()
            }, null, 2), {
              access: 'public',
              token: BLOB_READ_WRITE_TOKEN,
              contentType: 'application/json'
            });

            console.log(`[Delete API] Updated favorites to remove session ${sessionId}`);
          }
        }
      } catch (favoritesError) {
        console.warn(`[Delete API] Could not update favorites: ${favoritesError instanceof Error ? favoritesError.message : String(favoritesError)}`);
        // Don't fail the whole operation if favorites update fails
      }

      const totalFiles = sessionFiles.length;
      const successfulDeletes = deletedFiles.length;
      const failedDeletes = errors.length;

      if (successfulDeletes === 0 && totalFiles > 0) {
        return NextResponse.json({
          success: false,
          error: 'Failed to delete any files',
          errors,
          details: {
            totalFiles,
            successfulDeletes,
            failedDeletes
          }
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: totalFiles === 0 
          ? 'No files found for this session' 
          : `Successfully deleted ${successfulDeletes} of ${totalFiles} files`,
        deletedFiles,
        errors: errors.length > 0 ? errors : undefined,
        details: {
          totalFiles,
          successfulDeletes,
          failedDeletes
        }
      });

    } catch (listError) {
      console.error(`[Delete API] Error listing files for session ${sessionId}:`, listError);
      return NextResponse.json({
        success: false,
        error: `Failed to list files: ${listError instanceof Error ? listError.message : String(listError)}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Delete API] General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process delete request' 
      },
      { status: 500 }
    );
  }
}