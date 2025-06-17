"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Download, Heart, Share, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

interface OutfitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: {
    name: string;
    description: string;
    items: {
      top: { item: string; color: string; brand?: string; price?: string };
      bottom: { item: string; color: string; brand?: string; price?: string };
      shoes: { item: string; color: string; brand?: string; price?: string };
      accessories?: { item: string; color: string; brand?: string; price?: string }[];
    };
    styling_tips: string[];
    budget_estimate: string;
  };
  visualization?: {
    image_url: string;
    replicate_url?: string;
    width?: number;
    height?: number;
    blob_key?: string;
  };
  originalPhoto?: string;
  sessionId: string;
  outfitIndex: number;
  occasion: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export function OutfitDetailModal({
  isOpen,
  onClose,
  outfit,
  visualization,
  originalPhoto,
  sessionId,
  outfitIndex,
  occasion,
  isFavorited = false,
  onToggleFavorite
}: OutfitDetailModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!visualization?.image_url) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/fashion/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          outfitIndex,
          imageUrl: visualization.image_url,
          outfitName: outfit.name
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${outfit.name.replace(/\s+/g, '-')}-${sessionId}-HD.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share && visualization?.image_url) {
        await navigator.share({
          title: `${outfit.name} - AI Fashion Recommendation`,
          text: `Check out this ${occasion} outfit recommendation from AI Fashion Guru!`,
          url: window.location.href
        });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-w-7xl w-full h-[95vh] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Modal Content */}
        <div className="grid lg:grid-cols-2 h-full min-h-0 flex-1">
          {/* Image Section */}
          <div className="relative bg-slate-800 flex items-center justify-center min-h-0">
            {visualization?.image_url ? (
              <div className="relative w-full h-full flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={visualization.image_url}
                  alt={`${outfit.name} visualization`}
                  className={`max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                  style={{ 
                    maxHeight: '100%',
                    maxWidth: '100%',
                    height: 'auto',
                    width: 'auto'
                  }}
                />
                
                {/* Image Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-slate-900/80 border-slate-600 text-white hover:bg-slate-800"
                    onClick={() => setIsZoomed(!isZoomed)}
                  >
                    {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-slate-900/80 border-slate-600 text-white hover:bg-slate-800"
                    onClick={() => {
                      if (visualization?.image_url) {
                        window.open(visualization.image_url, '_blank');
                      }
                    }}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : originalPhoto ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={originalPhoto}
                  alt="Original photo"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-lg">
                  <p className="text-white text-center">
                    No visualization available
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">No image available</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 overflow-y-auto min-h-0 flex-1">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{outfit.name}</h2>
              <p className="text-slate-400 mb-4">{outfit.description}</p>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                {onToggleFavorite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-slate-600 ${
                      isFavorited 
                        ? 'text-pink-400 border-pink-500 bg-pink-500/10' 
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={onToggleFavorite}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                    {isFavorited ? 'Saved' : 'Save'}
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Share className="h-4 w-4 mr-2" />
                  )}
                  Share
                </Button>

                {visualization?.image_url && (
                  <Button
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download HD
                  </Button>
                )}
              </div>
            </div>

            {/* Outfit Items */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-white">Outfit Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Top:</span>
                    <span className="text-slate-300">{outfit.items.top.item} in {outfit.items.top.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Bottom:</span>
                    <span className="text-slate-300">{outfit.items.bottom.item} in {outfit.items.bottom.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Shoes:</span>
                    <span className="text-slate-300">{outfit.items.shoes.item} in {outfit.items.shoes.color}</span>
                  </div>
                  {outfit.items.accessories && outfit.items.accessories.length > 0 && (
                    <div>
                      <span className="font-medium text-white">Accessories:</span>
                      <ul className="text-slate-300 mt-1 space-y-1">
                        {outfit.items.accessories.map((accessory, index) => (
                          <li key={index}>• {accessory.item} in {accessory.color}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Styling Tips */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-white">Styling Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {outfit.styling_tips.map((tip, index) => (
                    <li key={index} className="text-slate-300">• {tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Budget & Info */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">Budget Estimate:</span>
                  <span className="text-slate-300">{outfit.budget_estimate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-white">Occasion:</span>
                  <span className="text-slate-300 capitalize">{occasion.replace('-', ' ')}</span>
                </div>
                {visualization?.width && visualization?.height && (
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Image Size:</span>
                    <span className="text-slate-300">{visualization.width} × {visualization.height}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}