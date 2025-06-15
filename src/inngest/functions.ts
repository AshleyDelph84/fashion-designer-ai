import { inngest } from "./client";
import { put } from "@vercel/blob";

const FASHION_BLOB_TOKEN = process.env.NEWSLETTER_READ_WRITE_TOKEN; // Reusing the same token for now
if (!FASHION_BLOB_TOKEN) {
  throw new Error('NEWSLETTER_READ_WRITE_TOKEN env variable is required');
}

// Define data structure for fashion analysis workflow
interface FashionAnalysisRequestedData {
  userId: string;
  sessionId: string;
  photoUrl: string;
  userPreferences: {
    styleTypes: string[];
    bodyType: string;
    occasions: string[];
    colors: string[];
    budget: string;
  };
  occasion: string;
  constraints?: string;
}

// Main Inngest function for fashion analysis workflow
export const generateFashionRecommendations = inngest.createFunction(
  { id: "generate-fashion-recommendations" },
  { event: "fashion/analysis.requested" },
  async ({ event, step }: { event: { data: FashionAnalysisRequestedData }; step: unknown }) => {
    const { userId, sessionId, photoUrl, userPreferences, occasion, constraints } = event.data;
    if (!userId || !sessionId || !photoUrl || !userPreferences || !occasion) {
      throw new Error("Missing required data in event payload.");
    }

    function assertStepHasRun(s: unknown): asserts s is { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } {
      if (!s || typeof s !== 'object' || typeof (s as { run?: unknown }).run !== 'function') {
        throw new Error('step.run is not available');
      }
    }
    assertStepHasRun(step);

    // Step 1: Analyze Photo with Fashion Analysis Agent
    const analysisResultUnknown = await step.run("analyze-photo", () => 
      analyzeFashionPhoto(photoUrl, userPreferences, occasion, constraints, sessionId)
    );
    if (typeof analysisResultUnknown !== 'string') {
      throw new Error('Fashion analysis agent did not return a string');
    }
    const analysisResult = analysisResultUnknown;

    // Step 2: Generate Outfit Recommendations
    const recommendationsUnknown = await step.run("generate-recommendations", () => 
      generateOutfitRecommendations(analysisResult, userPreferences, occasion, userPreferences.budget, sessionId)
    );
    if (typeof recommendationsUnknown !== 'string') {
      throw new Error('Outfit recommendation agent did not return a string');
    }
    const recommendations = recommendationsUnknown;

    // Step 3: Generate Visualization Images with Flux-kontext
    const visualizationsUnknown = await step.run("generate-visualizations", () => 
      generateOutfitVisualizations(photoUrl, JSON.parse(recommendations), sessionId)
    );
    const visualizations = visualizationsUnknown as { visualizations: Array<{ outfit_name: string; visualization?: { image_url: string }; error?: string }> };

    // Step 4: Save Results to Blob Storage
    const resultsData = {
      userId,
      sessionId,
      originalPhoto: photoUrl,
      analysis: analysisResult,
      recommendations: recommendations,
      visualizations: visualizations.visualizations,
      timestamp: new Date().toISOString(),
      userPreferences,
      occasion,
      constraints
    };

    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    const savedResultsUnknown = await step.run("save-results", () => 
      saveFashionResults(blobKey, JSON.stringify(resultsData, null, 2), sessionId)
    );
    if (!savedResultsUnknown || typeof savedResultsUnknown !== 'object' || typeof (savedResultsUnknown as { url?: unknown }).url !== 'string') {
      throw new Error('Blob result missing url');
    }
    const savedResults = savedResultsUnknown as { url: string };

    return { 
      success: true,
      sessionId,
      resultsUrl: savedResults.url,
      analysis: JSON.parse(analysisResult),
      recommendations: JSON.parse(recommendations),
      visualizations: visualizations.visualizations,
      message: `Fashion recommendations and visualizations generated for session ${sessionId}` 
    };
  }
);

// --- Fashion Processing Step Implementations ---

// Helper function to get the Python fashion agents URL
function getFashionAgentUrl(): string {
  // Use custom APP_URL if set (recommended approach)
  if (process.env.APP_URL) {
    return `${process.env.APP_URL}/api/agents`;
  }
  
  // For local development
  if (!process.env.VERCEL) {
    return 'http://localhost:8000';
  }
  
  // For production, use the production URL
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/agents`;
  }
  
  // For preview deployments, use branch URL
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}/api/agents`;
  }
  
  // Fallback
  console.warn('[Inngest] No suitable URL found for fashion agent, using deployment URL');
  return `https://${process.env.VERCEL_URL}/api/agents`;
}

async function analyzeFashionPhoto(
  photoUrl: string, 
  userPreferences: Record<string, unknown>, 
  occasion: string, 
  constraints: string | undefined, 
  sessionId: string
) {
  const fashionAgentUrl = getFashionAgentUrl();
  
  try {
    // Use Gemini agent for photo analysis
    const response = await fetch(`${fashionAgentUrl.replace('/api/agents', '/api/gemini')}/analyze-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        photo_url: photoUrl,
        user_preferences: userPreferences,
        occasion: occasion,
        constraints: constraints
      }),
    });

    if (!response.ok) {
      console.error(`[Inngest] Gemini fashion analysis request failed for session ${sessionId}. Status: ${response.status}`);
      throw new Error(`Gemini fashion analysis request failed with status ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.analysis;
    
    if (!analysis) {
      throw new Error('Gemini fashion analysis agent returned no content');
    }

    return analysis;
  } catch (error) {
    console.error(`[Inngest] Gemini fashion analysis error for session ${sessionId}:`, error);
    throw error;
  }
}

async function generateOutfitRecommendations(
  analysisResult: string, 
  userPreferences: Record<string, unknown>, 
  occasion: string, 
  budgetRange: string, 
  sessionId: string
) {
  const fashionAgentUrl = getFashionAgentUrl();
  
  try {
    // Use Gemini agent for outfit recommendations
    const response = await fetch(`${fashionAgentUrl.replace('/api/agents', '/api/gemini')}/recommend-outfit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        analysis_result: analysisResult,
        user_preferences: userPreferences,
        occasion: occasion,
        budget_range: budgetRange
      }),
    });

    if (!response.ok) {
      console.error(`[Inngest] Gemini outfit recommendation request failed for session ${sessionId}. Status: ${response.status}`);
      throw new Error(`Gemini outfit recommendation request failed with status ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.recommendations;
    
    if (!recommendations) {
      throw new Error('Gemini outfit recommendation agent returned no content');
    }

    return recommendations;
  } catch (error) {
    console.error(`[Inngest] Gemini outfit recommendation error for session ${sessionId}:`, error);
    throw error;
  }
}

async function generateOutfitVisualizations(
  userPhotoUrl: string,
  recommendations: Record<string, unknown>,
  sessionId: string
) {
  const fashionAgentUrl = getFashionAgentUrl();
  
  try {
    // Extract outfit recommendations from the recommendations object
    const outfitRecommendations = recommendations?.outfit_recommendations as Array<Record<string, unknown>>;
    
    if (!outfitRecommendations || !Array.isArray(outfitRecommendations)) {
      console.warn(`[Inngest] No outfit recommendations found for session ${sessionId}`);
      return { visualizations: [] };
    }

    // Use Flux agent to generate outfit visualizations
    const response = await fetch(`${fashionAgentUrl.replace('/api/agents', '/api/flux')}/generate-multiple-outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        user_photo_url: userPhotoUrl,
        outfits: outfitRecommendations,
        style_prompt: "professional fashion photography, high quality, realistic lighting",
        background: "modern minimalist studio"
      }),
    });

    if (!response.ok) {
      console.error(`[Inngest] Flux visualization request failed for session ${sessionId}. Status: ${response.status}`);
      // Don't throw error - continue without visualizations
      return { visualizations: [] };
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error(`[Inngest] Flux visualization failed for session ${sessionId}:`, data);
      return { visualizations: [] };
    }

    return data;
  } catch (error) {
    console.error(`[Inngest] Flux visualization error for session ${sessionId}:`, error);
    // Don't throw error - continue without visualizations
    return { visualizations: [] };
  }
}

async function saveFashionResults(blobKey: string, resultsContent: string, sessionId: string) {
  if (typeof resultsContent !== "string") {
    console.error(`[Inngest] Invalid content type for session ${sessionId}. Expected string, got ${typeof resultsContent}`);
    throw new Error("Invalid content type for saving fashion results to blob.");
  }
  try {
    const blob = await put(blobKey, resultsContent, {
      access: "public",
      contentType: "application/json",
      token: FASHION_BLOB_TOKEN,
      allowOverwrite: true,
    });
    return blob;
  } catch (error) {
    console.error(`[Inngest] Error saving fashion results to blob for session ${sessionId}:`, error);
    throw error;
  }
}
