"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { StyleCard } from "@/components/ui/style-card";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

const occasions = [
  { id: "work", title: "Work/Professional" },
  { id: "casual", title: "Casual Daily" },
  { id: "date-night", title: "Date Night" },
  { id: "formal-events", title: "Formal Events" },
  { id: "workout", title: "Workout/Active" },
  { id: "travel", title: "Travel" },
];

const qualityOptions = [
  { id: "standard", title: "Standard Quality", subtitle: "2x upscaled (~45 seconds)", recommended: false },
  { id: "high", title: "High Quality", subtitle: "2x upscaled with face enhancement (~90 seconds)", recommended: true },
  { id: "ultra", title: "Ultra Quality", subtitle: "4x upscaled with face enhancement (~120 seconds)", recommended: false },
];

export default function CreateOutfitPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<string>('high');
  const [constraints, setConstraints] = useState<string>('');
  const [textDescription, setTextDescription] = useState<string>('');

  const userPreferences = user?.unsafeMetadata?.stylePreferences as Record<string, unknown> | undefined;

  const handlePhotoSelected = (photoFile: string) => {
    setSelectedPhoto(photoFile);
  };

  const handleStartAnalysis = async () => {
    if (!selectedPhoto || !selectedOccasion) {
      alert('Please select a photo and occasion');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/fashion/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoFile: selectedPhoto,
          occasion: selectedOccasion,
          quality: selectedQuality,
          constraints: constraints || undefined,
          textDescription: textDescription || undefined,
          userPreferences: userPreferences || {},
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Redirect to results page
        router.push(`/dashboard/results/${result.sessionId}`);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to start analysis. Please try again.');
      setIsProcessing(false);
    }
  };

  const canProceed = selectedPhoto && selectedOccasion;

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
              <h1 className="text-xl font-bold">Create New Outfit</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {step === 1 && (
          <div className="space-y-8">
            {/* Step 1: Photo Upload */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Upload Your Photo</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a clear photo of yourself for AI analysis. Full body photos work best!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoUpload 
                  onPhotoSelected={handlePhotoSelected}
                  isUploading={isProcessing}
                />
              </CardContent>
            </Card>

            {selectedPhoto && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl text-white">What&apos;s the occasion?</CardTitle>
                  <CardDescription className="text-slate-400">
                    Tell us what you&apos;re dressing for so we can give you the perfect recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {occasions.map((occasion) => (
                      <StyleCard
                        key={occasion.id}
                        title={occasion.title}
                        selected={selectedOccasion === occasion.id}
                        onClick={() => setSelectedOccasion(occasion.id)}
                      />
                    ))}
                  </div>

                  {/* Quality Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-2">Image Quality</h3>
                    <p className="text-sm text-slate-400 mb-4">Choose your preferred quality level for generated outfit images</p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {qualityOptions.map((quality) => (
                        <div
                          key={quality.id}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedQuality === quality.id 
                              ? 'border-pink-500 bg-pink-500/10' 
                              : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                          }`}
                          onClick={() => setSelectedQuality(quality.id)}
                        >
                          {quality.recommended && (
                            <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                              Recommended
                            </div>
                          )}
                          <div className="text-white font-medium">{quality.title}</div>
                          <div className="text-slate-400 text-sm mt-1">{quality.subtitle}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="textDescription" className="block text-sm font-medium text-slate-300 mb-2">
                        Additional style details (Optional)
                      </label>
                      <Input
                        id="textDescription"
                        placeholder="e.g., 'I want to look professional but approachable', 'something trendy and youthful'"
                        value={textDescription}
                        onChange={(e) => setTextDescription(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="constraints" className="block text-sm font-medium text-slate-300 mb-2">
                        Any specific requirements or constraints? (Optional)
                      </label>
                      <Input
                        id="constraints"
                        placeholder="e.g., 'budget under $200', 'no bright colors', 'business casual only'"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canProceed && (
              <div className="text-center">
                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-lg px-8 py-3"
                  onClick={handleStartAnalysis}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing Your Style...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Get My Style Recommendations
                    </>
                  )}
                </Button>
                <p className="text-sm text-slate-400 mt-3">
                  This will take 45-120 seconds to analyze your photo and generate high-quality upscaled recommendations
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}