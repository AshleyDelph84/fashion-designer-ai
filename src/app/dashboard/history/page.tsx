"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { ArrowLeft, Calendar, Eye, Heart, Sparkles, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

interface HistoryItem {
  sessionId: string;
  timestamp: string;
  occasion: string;
  analysisData: {
    bodyType: string;
    dominantColors: string[];
    outfitCount: number;
  };
  originalPhoto: string;
  previewOutfit: {
    name: string;
    description: string;
  } | null;
  hasVisualizations: boolean;
}

interface HistoryResponse {
  success: boolean;
  history: HistoryItem[];
  total: number;
  message?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; sessionId: string; }>({ isOpen: false, sessionId: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/fashion/history');
      const data: HistoryResponse = await response.json();

      if (data.success) {
        setHistory(data.history);
      } else {
        setError(data.message || 'Failed to load history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
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

  const handleViewResults = (sessionId: string) => {
    router.push(`/dashboard/results/${sessionId}`);
  };

  const handleDeleteClick = (sessionId: string) => {
    setDeleteModal({ isOpen: true, sessionId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.sessionId) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/fashion/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: deleteModal.sessionId })
      });

      const data = await response.json();

      if (data.success) {
        // Remove the item from the history list
        setHistory(prev => prev.filter(item => item.sessionId !== deleteModal.sessionId));
        setDeleteModal({ isOpen: false, sessionId: '' });
        
        // Show success message (optional)
        console.log(`Successfully deleted session: ${deleteModal.sessionId}`);
      } else {
        console.error('Failed to delete:', data.error);
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, sessionId: '' });
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
                <Sparkles className="h-6 w-6 text-pink-400" />
                <h1 className="text-xl font-bold">Style History</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pink-400" />
            <p className="text-slate-400">Loading your style history...</p>
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
              <Sparkles className="h-6 w-6 text-pink-400" />
              <h1 className="text-xl font-bold">Style History</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Unable to Load History</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button onClick={fetchHistory} className="bg-pink-500 hover:bg-pink-600">
              Try Again
            </Button>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">No Style History Yet</h2>
            <p className="text-slate-400 mb-6">
              Create your first outfit analysis to see your style journey here!
            </p>
            <Button 
              onClick={() => router.push('/dashboard/create-outfit')}
              className="bg-pink-500 hover:bg-pink-600"
            >
              Create Your First Outfit
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Your Style Journey</h2>
              <p className="text-slate-400">
                You&apos;ve created {history.length} outfit analysis{history.length !== 1 ? 'es' : ''} so far
              </p>
            </div>

            {/* History Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item) => (
                <Card key={item.sessionId} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white capitalize">
                        {item.occasion.replace('-', ' ')}
                      </CardTitle>
                      {item.hasVisualizations && (
                        <div className="flex items-center text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Visualized
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-slate-400 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(item.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Original Photo Preview */}
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-700">
                      <img
                        src={item.originalPhoto}
                        alt="Original photo"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Analysis Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Body Type:</span>
                        <span className="text-white capitalize">{item.analysisData.bodyType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Outfits:</span>
                        <span className="text-white">{item.analysisData.outfitCount} recommendations</span>
                      </div>
                      {item.analysisData.dominantColors && item.analysisData.dominantColors.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-slate-400 text-sm">Best Colors:</span>
                          <div className="flex flex-wrap gap-1">
                            {item.analysisData.dominantColors.map((color, index) => (
                              <span key={index} className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">
                                {color}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview Outfit */}
                    {item.previewOutfit && (
                      <div className="border-t border-slate-600 pt-3">
                        <h4 className="text-sm font-medium text-white mb-1">
                          {item.previewOutfit.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.previewOutfit.description}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-pink-500 hover:bg-pink-600 flex-1"
                        onClick={() => handleViewResults(item.sessionId)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Results
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/10 hover:border-red-500"
                        onClick={() => handleDeleteClick(item.sessionId)}
                        title="Delete this outfit generation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName="outfit generation"
      />
    </div>
  );
}