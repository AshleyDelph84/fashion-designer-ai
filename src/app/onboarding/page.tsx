"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StyleCard } from "@/components/ui/style-card";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ColorPicker } from "@/components/ui/color-picker";
import { 
  Shirt, 
  Crown, 
  Briefcase, 
  Coffee, 
  Heart, 
  Sparkles,
  User,
  ShoppingBag,
  DollarSign,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

const steps = [
  { title: "Style Type", description: "Your aesthetic" },
  { title: "Body Type", description: "Best fit" },
  { title: "Occasions", description: "When you dress" },
  { title: "Colors", description: "Your palette" },
  { title: "Budget", description: "Price range" },
];

const styleTypes = [
  { id: "casual", title: "Casual", description: "Relaxed, everyday comfort", icon: <Coffee className="h-8 w-8 text-indigo-400" /> },
  { id: "professional", title: "Professional", description: "Business and work attire", icon: <Briefcase className="h-8 w-8 text-blue-400" /> },
  { id: "formal", title: "Formal", description: "Elegant, sophisticated looks", icon: <Crown className="h-8 w-8 text-purple-400" /> },
  { id: "trendy", title: "Trendy", description: "Fashion-forward styles", icon: <Sparkles className="h-8 w-8 text-pink-400" /> },
  { id: "classic", title: "Classic", description: "Timeless, traditional pieces", icon: <Shirt className="h-8 w-8 text-emerald-400" /> },
  { id: "bohemian", title: "Bohemian", description: "Free-spirited, artistic", icon: <Heart className="h-8 w-8 text-orange-400" /> },
];

const bodyTypes = [
  { id: "pear", title: "Pear", description: "Hips wider than shoulders" },
  { id: "apple", title: "Apple", description: "Fuller midsection" },
  { id: "hourglass", title: "Hourglass", description: "Balanced proportions" },
  { id: "rectangle", title: "Rectangle", description: "Similar hip and shoulder width" },
  { id: "inverted-triangle", title: "Inverted Triangle", description: "Shoulders wider than hips" },
  { id: "unsure", title: "Not Sure", description: "Let AI help determine" },
];

const occasions = [
  { id: "work", title: "Work/Professional", icon: <Briefcase className="h-6 w-6" /> },
  { id: "casual", title: "Casual Daily", icon: <Coffee className="h-6 w-6" /> },
  { id: "date-night", title: "Date Night", icon: <Heart className="h-6 w-6" /> },
  { id: "formal-events", title: "Formal Events", icon: <Crown className="h-6 w-6" /> },
  { id: "workout", title: "Workout/Active", icon: <User className="h-6 w-6" /> },
  { id: "travel", title: "Travel", icon: <ShoppingBag className="h-6 w-6" /> },
];

const budgetRanges = [
  { id: "budget", title: "Budget-Friendly", description: "Under $50 per item", icon: <DollarSign className="h-6 w-6 text-green-400" /> },
  { id: "mid-range", title: "Mid-Range", description: "$50 - $150 per item", icon: <DollarSign className="h-6 w-6 text-yellow-400" /> },
  { id: "premium", title: "Premium", description: "$150 - $300 per item", icon: <DollarSign className="h-6 w-6 text-orange-400" /> },
  { id: "luxury", title: "Luxury", description: "$300+ per item", icon: <DollarSign className="h-6 w-6 text-purple-400" /> },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [preferences, setPreferences] = useState({
    styleTypes: [] as string[],
    bodyType: '',
    occasions: [] as string[],
    colors: [] as string[],
    budget: '',
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingCompleted: true,
          stylePreferences: preferences,
        },
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating user metadata:', error);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return preferences.styleTypes.length > 0;
      case 2:
        return preferences.bodyType !== '';
      case 3:
        return preferences.occasions.length > 0;
      case 4:
        return preferences.colors.length > 0;
      case 5:
        return preferences.budget !== '';
      default:
        return false;
    }
  };

  const toggleStyleType = (styleId: string) => {
    setPreferences(prev => ({
      ...prev,
      styleTypes: prev.styleTypes.includes(styleId)
        ? prev.styleTypes.filter(id => id !== styleId)
        : [...prev.styleTypes, styleId]
    }));
  };

  const toggleOccasion = (occasionId: string) => {
    setPreferences(prev => ({
      ...prev,
      occasions: prev.occasions.includes(occasionId)
        ? prev.occasions.filter(id => id !== occasionId)
        : [...prev.occasions, occasionId]
    }));
  };

  const toggleColor = (color: string) => {
    setPreferences(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 text-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-pink-400 mr-2" />
            <h1 className="text-3xl font-bold">Style Preferences</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Let&apos;s learn about your style to give you the best recommendations
          </p>
        </div>

        {/* Progress Steps */}
        <ProgressSteps steps={steps} currentStep={currentStep} className="mb-8" />

        {/* Step Content */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardContent className="p-8">
            {/* Step 1: Style Types */}
            {currentStep === 1 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-white mb-2">What&apos;s your style?</CardTitle>
                  <CardDescription className="text-slate-400">
                    Select all styles that resonate with you (you can choose multiple)
                  </CardDescription>
                </CardHeader>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {styleTypes.map((style) => (
                    <StyleCard
                      key={style.id}
                      title={style.title}
                      description={style.description}
                      icon={style.icon}
                      selected={preferences.styleTypes.includes(style.id)}
                      onClick={() => toggleStyleType(style.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Body Type */}
            {currentStep === 2 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-white mb-2">What&apos;s your body type?</CardTitle>
                  <CardDescription className="text-slate-400">
                    This helps us recommend the most flattering fits for you
                  </CardDescription>
                </CardHeader>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bodyTypes.map((bodyType) => (
                    <StyleCard
                      key={bodyType.id}
                      title={bodyType.title}
                      description={bodyType.description}
                      icon={<User className="h-8 w-8 text-purple-400" />}
                      selected={preferences.bodyType === bodyType.id}
                      onClick={() => setPreferences(prev => ({ ...prev, bodyType: bodyType.id }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Occasions */}
            {currentStep === 3 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-white mb-2">When do you need style help?</CardTitle>
                  <CardDescription className="text-slate-400">
                    Select the occasions you dress for most often
                  </CardDescription>
                </CardHeader>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {occasions.map((occasion) => (
                    <StyleCard
                      key={occasion.id}
                      title={occasion.title}
                      icon={occasion.icon}
                      selected={preferences.occasions.includes(occasion.id)}
                      onClick={() => toggleOccasion(occasion.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Colors */}
            {currentStep === 4 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-white mb-2">What colors do you love?</CardTitle>
                  <CardDescription className="text-slate-400">
                    Select your favorite colors (choose 3-6 for best results)
                  </CardDescription>
                </CardHeader>
                <ColorPicker
                  selectedColors={preferences.colors}
                  onColorToggle={toggleColor}
                  maxSelection={6}
                  className="justify-center"
                />
                {preferences.colors.length > 0 && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-slate-400">
                      Selected {preferences.colors.length} color{preferences.colors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Budget */}
            {currentStep === 5 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-2xl text-white mb-2">What&apos;s your budget range?</CardTitle>
                  <CardDescription className="text-slate-400">
                    This helps us recommend items within your price range
                  </CardDescription>
                </CardHeader>
                <div className="space-y-4">
                  {budgetRanges.map((budget) => (
                    <label
                      key={budget.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        preferences.budget === budget.id
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="budget"
                        value={budget.id}
                        checked={preferences.budget === budget.id}
                        onChange={(e) => setPreferences(prev => ({ ...prev, budget: e.target.value }))}
                        className="sr-only"
                      />
                      <div className="flex items-center flex-1">
                        <div className="mr-4">
                          {budget.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{budget.title}</h3>
                          <p className="text-slate-400 text-sm">{budget.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          preferences.budget === budget.id
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-slate-500'
                        }`}>
                          {preferences.budget === budget.id && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <Button
            className="bg-pink-500 hover:bg-pink-600"
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            {currentStep === steps.length ? 'Complete Setup' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}