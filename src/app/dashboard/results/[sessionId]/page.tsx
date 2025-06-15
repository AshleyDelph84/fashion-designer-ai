"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2, Heart, Share, Download } from "lucide-react";

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const [sessionId, setSessionId] = useState<string>('');
  
  useEffect(() => {
    params.then(resolved => setSessionId(resolved.sessionId));
  }, [params]);
  const router = useRouter();
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!sessionId) return;
    
    const checkResults = async () => {
      try {
        const response = await fetch(`/api/fashion/results/${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setResults(data.data);
          setIsLoading(false);
        } else {
          // Still processing, check again in a few seconds
          setTimeout(checkResults, 3000);
        }
      } catch (error) {
        console.error('Error checking results:', error);
        setError('Failed to load results');
        setIsLoading(false);
      }
    };

    checkResults();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pink-400" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Style...</h2>
          <p className="text-slate-400">
            Our AI is creating personalized outfit recommendations just for you
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const analysis = results?.analysis as Record<string, unknown>;
  const recommendations = results?.recommendations as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold">Your Style Analysis</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Heart className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Original Photo */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Your Original Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={results?.originalPhoto as string}
                alt="Original photo"
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>

          {/* Analysis Summary */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Style Analysis</CardTitle>
              <CardDescription className="text-slate-400">
                Our AI analysis of your unique features and style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Body Type</h4>
                <p className="text-slate-300 capitalize">{(analysis?.body_analysis as Record<string, unknown>)?.body_type as string}</p>
                <p className="text-sm text-slate-400">{(analysis?.body_analysis as Record<string, unknown>)?.proportions as string}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-2">Best Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {((analysis?.color_analysis as Record<string, unknown>)?.best_colors as string[])?.map((color: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm">
                      {color}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Undertone: {(analysis?.color_analysis as Record<string, unknown>)?.skin_undertone as string}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Style Summary</h4>
                <p className="text-slate-300">{analysis?.recommendations_summary as string}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outfit Recommendations */}
        {Array.isArray(recommendations?.outfit_recommendations) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-6">Recommended Outfits</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(recommendations.outfit_recommendations as Array<Record<string, unknown>>).map((outfit, index: number) => {
                // Find matching visualization for this outfit
                const visualization = (results?.visualizations as Array<{ outfit_name: string; visualization?: { image_url: string }; error?: string }>)?.find(
                  v => v.outfit_name === outfit.name || v.outfit_name === `Outfit ${index + 1}`
                );
                
                return (
                  <Card key={index} className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{outfit.name as string}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {outfit.description as string}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Outfit Visualization Image */}
                      {visualization?.visualization?.image_url && (
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-700">
                          <img
                            src={visualization.visualization.image_url}
                            alt={`${outfit.name} visualization`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Outfit Items */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-white">Top:</span>{' '}
                          <span className="text-slate-300">{(outfit.items as Record<string, Record<string, unknown>>)?.top?.item as string} in {(outfit.items as Record<string, Record<string, unknown>>)?.top?.color as string}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-white">Bottom:</span>{' '}
                          <span className="text-slate-300">{(outfit.items as Record<string, Record<string, unknown>>)?.bottom?.item as string} in {(outfit.items as Record<string, Record<string, unknown>>)?.bottom?.color as string}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-white">Shoes:</span>{' '}
                          <span className="text-slate-300">{(outfit.items as Record<string, Record<string, unknown>>)?.shoes?.item as string} in {(outfit.items as Record<string, Record<string, unknown>>)?.shoes?.color as string}</span>
                        </div>
                      </div>

                      {/* Styling Tips */}
                      <div>
                        <h5 className="font-medium text-white mb-2">Styling Tips:</h5>
                        <ul className="text-sm text-slate-400 space-y-1">
                          {(outfit.styling_tips as string[])?.map((tip: string, tipIndex: number) => (
                            <li key={tipIndex}>• {tip}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Budget and Actions */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-600">
                        <span className="text-sm text-slate-400">{outfit.budget_estimate as string}</span>
                        <Button size="sm" className="bg-pink-500 hover:bg-pink-600">
                          View Details
                        </Button>
                      </div>
                      
                      {/* Visualization Error */}
                      {visualization?.error && (
                        <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                          Visualization unavailable: {visualization.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* General Advice */}
        {Array.isArray(recommendations?.general_styling_advice) && (
          <Card className="mt-8 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Personal Styling Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(recommendations.general_styling_advice as string[]).map((advice: string, index: number) => (
                  <li key={index} className="text-slate-300">• {advice}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-8 text-center space-x-4">
          <Button className="bg-pink-500 hover:bg-pink-600" onClick={() => router.push('/dashboard/create-outfit')}>
            Create Another Outfit
          </Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <Download className="mr-2 h-4 w-4" />
            Download Results
          </Button>
        </div>
      </main>
    </div>
  );
}