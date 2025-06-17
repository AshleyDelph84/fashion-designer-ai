"use client";

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Sparkles, History, Settings, Upload, Heart } from "lucide-react";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const handleCreateOutfit = () => {
    router.push('/dashboard/create-outfit');
  };

  const hasCompletedOnboarding = user?.unsafeMetadata?.onboardingCompleted;

  if (!hasCompletedOnboarding) {
    router.push('/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-pink-400" />
              <h1 className="text-2xl font-bold">AI Fashion Guru</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => router.push('/dashboard/favorites')}
              >
                <Heart className="mr-2 h-4 w-4" />
                Favorites
              </Button>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  }
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName || 'Fashionista'}! ✨
          </h2>
          <p className="text-slate-400 text-lg">
            Ready to create your next stunning outfit? Upload a photo to get started.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer" onClick={handleCreateOutfit}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-pink-400" />
              </div>
              <CardTitle className="text-xl text-white">Create New Outfit</CardTitle>
              <CardDescription className="text-slate-400">
                Upload your photo and get AI-powered style recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full bg-pink-500 hover:bg-pink-600">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/history')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                <History className="h-8 w-8 text-purple-400" />
              </div>
              <CardTitle className="text-xl text-white">Style History</CardTitle>
              <CardDescription className="text-slate-400">
                View your previous outfit recommendations and favorites
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => router.push('/dashboard/history')}>
                View History
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Settings className="h-8 w-8 text-indigo-400" />
              </div>
              <CardTitle className="text-xl text-white">Style Preferences</CardTitle>
              <CardDescription className="text-slate-400">
                Update your style preferences and personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => router.push('/onboarding')}>
                Update Preferences
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats/Info Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white">3</CardTitle>
              <CardDescription className="text-slate-400">Free Outfit Analyses Remaining</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white">0</CardTitle>
              <CardDescription className="text-slate-400">Outfits Created</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white">Pro</CardTitle>
              <CardDescription className="text-slate-400">
                <Button variant="outline" className="mt-2 border-emerald-600 text-emerald-400 hover:bg-emerald-500/10">
                  Upgrade Plan
                </Button>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}