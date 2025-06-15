"use client";

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Sparkles, User, Palette, ShoppingBag, Heart } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/sign-up');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-pink-400" />
            <h1 className="text-2xl font-bold">AI Fashion Guru</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => router.push('/sign-in')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              Your Personal
              <br />
              <span className="text-pink-400">AI Fashion Stylist</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-xl">
              Upload your photo and get personalized outfit recommendations with AI-generated visualizations. 
              Professional styling advice tailored to your body shape, skin tone, and style preferences.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="bg-pink-500 hover:bg-pink-600 text-white text-lg px-8 py-3" onClick={handleGetStarted}>
                <Camera className="mr-2 h-5 w-5" />
                Get Your Style Analysis
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-lg px-8 py-3">
                <User className="mr-2 h-5 w-5" />
                See How It Works
              </Button>
            </div>
          </div>
          <div className="hidden md:block relative aspect-video bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Fashion visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4 p-8">
                <div className="flex flex-col items-center">
                  <Camera className="h-12 w-12 text-pink-400 mb-2" />
                  <span className="text-xs text-slate-400">Photo Analysis</span>
                </div>
                <div className="flex flex-col items-center">
                  <Sparkles className="h-12 w-12 text-purple-400 mb-2" />
                  <span className="text-xs text-slate-400">AI Styling</span>
                </div>
                <div className="flex flex-col items-center">
                  <Palette className="h-12 w-12 text-indigo-400 mb-2" />
                  <span className="text-xs text-slate-400">Color Matching</span>
                </div>
                <div className="flex flex-col items-center">
                  <ShoppingBag className="h-12 w-12 text-emerald-400 mb-2" />
                  <span className="text-xs text-slate-400">Outfit Suggestions</span>
                </div>
              </div>
            </div>
            <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-pink-500/20 rounded-full filter blur-2xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-purple-500/20 rounded-full filter blur-2xl animate-blob animation-delay-4000"></div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">How It Works</h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our AI-powered fashion analysis provides professional styling advice in minutes. 
              Simply upload your photo and get personalized recommendations.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-pink-400" />
                </div>
                <CardTitle className="text-xl text-white">1. Upload Your Photo</CardTitle>
                <CardDescription className="text-slate-400">
                  Take or upload a full-body photo. Our AI analyzes your body shape, proportions, and current style.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <CardTitle className="text-xl text-white">2. AI Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Advanced AI determines your skin tone, body type, and style preferences to create personalized recommendations.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-emerald-400" />
                </div>
                <CardTitle className="text-xl text-white">3. Get Styled</CardTitle>
                <CardDescription className="text-slate-400">
                  Receive outfit recommendations with visualizations showing you in the new styles, complete with shopping links.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 text-center">
          <h3 className="text-3xl font-bold mb-4">Why Choose AI Fashion Guru?</h3>
          <p className="text-slate-400 mb-12 max-w-2xl mx-auto">
            Professional styling advice that understands your unique features and preferences, 
            available 24/7 at a fraction of traditional stylist costs.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <User className="h-12 w-12 text-pink-400 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Personalized Analysis</h4>
              <p className="text-slate-400 text-sm">AI analyzes your unique body shape, skin tone, and style to create recommendations just for you.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Heart className="h-12 w-12 text-pink-400 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Confidence Boost</h4>
              <p className="text-slate-400 text-sm">See yourself in new outfits before you buy, ensuring you love how you look.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Palette className="h-12 w-12 text-pink-400 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Style Education</h4>
              <p className="text-slate-400 text-sm">Learn why certain styles work for you with detailed explanations and styling tips.</p>
            </div>
          </div>
        </section>

        {/* Get Started Section */}
        <section className="py-16 md:py-24">
          <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-slate-700">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4 text-white">Ready to Transform Your Style?</h3>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                Join thousands who have discovered their perfect style with AI-powered fashion advice. 
                Start with 3 free outfit analyses!
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button className="bg-pink-500 hover:bg-pink-600 text-lg px-8 py-3" onClick={handleGetStarted}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-lg px-8 py-3">
                  <Heart className="mr-2 h-5 w-5" />
                  See Example Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-slate-700/50">
        <p className="text-slate-500">© 2024 AI Fashion Guru • Transform your style with AI</p>
      </footer>
    </div>
  );
}
