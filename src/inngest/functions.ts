import { inngest } from "./client";
import { put } from "@vercel/blob";
import Replicate from "replicate";

const FASHION_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!FASHION_BLOB_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN env variable is required');
}

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN env variable is required');
}

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

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
  textDescription?: string;
}

// Main Inngest function for fashion analysis workflow
export const generateFashionRecommendations = inngest.createFunction(
  { id: "generate-fashion-recommendations" },
  { event: "fashion/analysis.requested" },
  async ({ event, step }: { event: { data: FashionAnalysisRequestedData }; step: unknown }) => {
    const { userId, sessionId, photoUrl, userPreferences, occasion, constraints, textDescription } = event.data;
    console.log(`[Inngest] Starting fashion analysis workflow for session ${sessionId}`);
    console.log(`[Inngest] Photo URL: ${photoUrl}`);
    console.log(`[Inngest] User ID: ${userId}`);
    console.log(`[Inngest] Occasion: ${occasion}`);
    
    if (!userId || !sessionId || !photoUrl || !userPreferences || !occasion) {
      console.error(`[Inngest] Missing required data for session ${sessionId}:`, { userId: !!userId, sessionId: !!sessionId, photoUrl: !!photoUrl, userPreferences: !!userPreferences, occasion: !!occasion });
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
      analyzeFashionPhoto(photoUrl, userPreferences, occasion, constraints, sessionId, textDescription)
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
      generateOutfitVisualizations(photoUrl, JSON.parse(extractJsonFromMarkdown(recommendations)), sessionId, userPreferences, occasion)
    );
    const visualizations = visualizationsUnknown as { visualizations: Array<{ outfit_name: string; visualization?: { image_url: string }; error?: string }> };

    // Step 4: Save Results to Blob Storage
    const resultsData = {
      userId,
      sessionId,
      originalPhoto: photoUrl,
      analysis: JSON.parse(extractJsonFromMarkdown(analysisResult)),
      recommendations: JSON.parse(extractJsonFromMarkdown(recommendations)),
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
      analysis: JSON.parse(extractJsonFromMarkdown(analysisResult)),
      recommendations: JSON.parse(extractJsonFromMarkdown(recommendations)),
      visualizations: visualizations.visualizations,
      message: `Fashion recommendations and visualizations generated for session ${sessionId}` 
    };
  }
);

// --- Fashion Processing Step Implementations ---

// Helper function to extract JSON from markdown code blocks
function extractJsonFromMarkdown(markdownText: string): string {
  // Handle case where response is already clean JSON
  const trimmed = markdownText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  
  // Extract JSON from markdown code blocks
  const jsonMatch = markdownText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  
  // If no markdown blocks found, return as-is
  return markdownText;
}

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
  sessionId: string,
  textDescription?: string
) {
  const fashionAgentUrl = getFashionAgentUrl();
  
  try {
    // Use Google ADK agent for photo analysis
    const response = await fetch(`${fashionAgentUrl}/analyze-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        photo_url: photoUrl,
        user_preferences: userPreferences,
        occasion: occasion,
        constraints: constraints,
        text_description: textDescription
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
    // Use Google ADK agent for outfit recommendations
    const response = await fetch(`${fashionAgentUrl}/recommend-outfit`, {
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
  sessionId: string,
  userPreferences?: Record<string, unknown>,
  occasion?: string
) {
  try {
    // Extract outfit recommendations from the recommendations object
    const outfitRecommendations = recommendations?.outfit_recommendations as Array<Record<string, unknown>>;
    
    if (!outfitRecommendations || !Array.isArray(outfitRecommendations)) {
      console.warn(`[Inngest] No outfit recommendations found for session ${sessionId}`);
      return { visualizations: [] };
    }

    const generated_visualizations = [];
    
    // Generate visualizations for each outfit using direct Replicate API calls
    for (let i = 0; i < outfitRecommendations.length; i++) {
      const outfit = outfitRecommendations[i];
      
      try {
        // Create outfit description from the outfit data
        const outfitItems = outfit.items as Record<string, unknown> || {};
        const topItem = outfitItems.top as Record<string, unknown> || {};
        const bottomItem = outfitItems.bottom as Record<string, unknown> || {};
        const shoesItem = outfitItems.shoes as Record<string, unknown> || {};
        
        const outfitDescription = `
          ${topItem.item || 'shirt'} in ${topItem.color || 'neutral'} color,
          ${bottomItem.item || 'pants'} in ${bottomItem.color || 'neutral'} color,
          ${shoesItem.item || 'shoes'} in ${shoesItem.color || 'neutral'} color
        `.trim();
        
        // Flux-kontext-max optimized prompt following official best practices
        const styleTypes = Array.isArray(userPreferences?.styleTypes) ? (userPreferences.styleTypes as string[]).join(', ') : 'stylish';
        const occasionStyle = occasion === 'workout' ? 'athletic, confident' : 
                            occasion === 'date-night' ? 'elegant, romantic' :
                            occasion === 'work' ? 'professional, polished' : 'fashionable';
        
        const prompt = `Change the clothing to ${outfitDescription} while keeping the same facial features, exact same pose, same hair, and same background. Style: ${styleTypes}, ${occasionStyle}. Maintain the original composition and lighting.`;
        
        console.log(`[Inngest] Generating outfit visualization ${i + 1} for session ${sessionId} - OUTFIT EDITING MODE`);
        console.log(`[Inngest] Outfit description: ${outfitDescription}`);
        console.log(`[Inngest] Style preferences: ${styleTypes}, ${occasionStyle}`);
        console.log(`[Inngest] Enhanced prompt: ${prompt}`);
        
        // Generate image using FLUX.1 Kontext-max with correct parameters
        const output = await replicate.run(
          "black-forest-labs/flux-kontext-max",
          {
            input: {
              prompt: prompt,
              input_image: userPhotoUrl,        // Correct parameter name
              aspect_ratio: "match_input_image", // Preserve original dimensions
              output_format: "jpg",
              safety_tolerance: 2,              // Maximum allowed for input images
              seed: 42                          // For reproducible results
            }
          }
        );
        
        if (output) {
          const imageUrl = typeof output === 'string' ? output : (output as string[])[0];
          generated_visualizations.push({
            outfit_name: outfit.name as string || `Outfit ${i + 1}`,
            visualization: {
              image_url: imageUrl,
              width: 768,
              height: 1024
            },
            outfit_data: outfit
          });
          console.log(`[Inngest] Successfully generated visualization ${i + 1} for session ${sessionId}`);
        } else {
          console.warn(`[Inngest] No output from Replicate for outfit ${i + 1} in session ${sessionId}`);
          generated_visualizations.push({
            outfit_name: outfit.name as string || `Outfit ${i + 1}`,
            error: "Failed to generate visualization",
            outfit_data: outfit
          });
        }
      } catch (error) {
        console.error(`[Inngest] Failed to generate visualization for outfit ${i + 1} in session ${sessionId}:`, error);
        generated_visualizations.push({
          outfit_name: outfit.name as string || `Outfit ${i + 1}`,
          error: `Visualization generation failed: ${error instanceof Error ? error.message : String(error)}`,
          outfit_data: outfit
        });
      }
    }
    
    return {
      visualizations: generated_visualizations,
      total_generated: generated_visualizations.filter(v => 'visualization' in v).length
    };
  } catch (error) {
    console.error(`[Inngest] Error in outfit visualization generation for session ${sessionId}:`, error);
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
