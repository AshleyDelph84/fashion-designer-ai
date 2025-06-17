"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Eye, Calendar, Loader2, HeartOff } from "lucide-react";

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

interface FavoritesResponse {
  success: boolean;
  favorites: FavoriteOutfit[];
  total: number;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [removingFavorites, setRemovingFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/fashion/favorites');
      const data: FavoritesResponse = await response.json();

      if (data.success) {
        setFavorites(data.favorites.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
      } else {
        setError('Failed to load favorites');
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setError('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (sessionId: string, outfitIndex: number) => {
    const favoriteId = `${sessionId}-${outfitIndex}`;
    setRemovingFavorites(prev => ({ ...prev, [favoriteId]: true }));
    
    try {
      const response = await fetch('/api/fashion/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, outfitIndex, action: 'remove' })
      });

      const data = await response.json();
      if (data.success) {
        setFavorites(prev => prev.filter(f => !(f.sessionId === sessionId && f.outfitIndex === outfitIndex)));
      } else {
        console.error('Failed to remove favorite:', data.error);
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingFavorites(prev => ({ ...prev, [favoriteId]: false }));
    }
  };

  const handleViewResults = (sessionId: string) => {
    router.push(`/dashboard/results/${sessionId}`);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white">
        <header className="border-b border-slate-700/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-pink-400" />
                <h1 className="text-xl font-bold">Favorite Outfits</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pink-400" />
            <p className="text-slate-400">Loading your favorite outfits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-pink-400" />
              <h1 className="text-xl font-bold">Favorite Outfits</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Unable to Load Favorites</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button onClick={fetchFavorites} className="bg-pink-500 hover:bg-pink-600">
              Try Again
            </Button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <HeartOff className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">No Favorite Outfits Yet</h2>
            <p className="text-slate-400 mb-6">
              Save outfits you love by clicking the heart icon on any outfit recommendation!
            </p>
            <Button 
              onClick={() => router.push('/dashboard/create-outfit')}
              className="bg-pink-500 hover:bg-pink-600"
            >
              Create New Outfit
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Your Favorite Outfits</h2>
              <p className="text-slate-400">
                You have {favorites.length} saved outfit{favorites.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Favorites Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => {
                const favoriteId = `${favorite.sessionId}-${favorite.outfitIndex}`;
                const outfit = favorite.outfitData;
                
                return (
                  <Card key={favoriteId} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">
                          {favorite.outfitName}
                        </CardTitle>
                        <div className="flex items-center text-xs text-pink-400 bg-pink-400/10 px-2 py-1 rounded-full">
                          <Heart className="h-3 w-3 mr-1 fill-current" />
                          Saved
                        </div>
                      </div>
                      <CardDescription className="text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{favorite.occasion.replace('-', ' ')}</span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(favorite.savedAt)}
                          </span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Outfit Visualization */}
                      {favorite.visualization?.image_url ? (
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-700">
                          <img
                            src={favorite.visualization.image_url}
                            alt={`${favorite.outfitName} visualization`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-700">
                          <img
                            src={favorite.originalPhoto}
                            alt="Original photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Outfit Description */}
                      <div>
                        <p className="text-sm text-slate-300 line-clamp-3">
                          {(outfit as { description?: string }).description}
                        </p>
                      </div>

                      {/* Outfit Items Summary */}
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400">
                          <span className="font-medium">Items:</span>{' '}
                          {((outfit as { items?: Record<string, Record<string, unknown>> }).items?.top as { item?: string })?.item}, {((outfit as { items?: Record<string, Record<string, unknown>> }).items?.bottom as { item?: string })?.item}, {((outfit as { items?: Record<string, Record<string, unknown>> }).items?.shoes as { item?: string })?.item}
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="font-medium">Budget:</span>{' '}
                          {(outfit as { budget_estimate?: string }).budget_estimate}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="bg-pink-500 hover:bg-pink-600 flex-1"
                          onClick={() => handleViewResults(favorite.sessionId)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Results
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => removeFavorite(favorite.sessionId, favorite.outfitIndex)}
                          disabled={removingFavorites[favoriteId]}
                        >
                          {removingFavorites[favoriteId] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <HeartOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}