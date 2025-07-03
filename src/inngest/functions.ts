import { inngest } from "./client";
import { put } from "@vercel/blob";
import Replicate from "replicate";

const FASHION_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
console.log(`[Inngest] Checking blob token configuration...`);
console.log(`[Inngest] BLOB_READ_WRITE_TOKEN exists: ${!!process.env.BLOB_READ_WRITE_TOKEN}`);
console.log(`[Inngest] FASHION_BLOB_TOKEN configured: ${!!FASHION_BLOB_TOKEN}`);
if (!FASHION_BLOB_TOKEN) {
  console.error('[Inngest] CRITICAL: No blob token found! Please set BLOB_READ_WRITE_TOKEN');
  throw new Error('BLOB_READ_WRITE_TOKEN env variable is required');
}

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN env variable is required');
}

const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

// Quality settings for different generation modes
function getQualitySettings(quality: string) {
  switch (quality) {
    case 'standard':
      return {
        num_inference_steps: 30,
        guidance_scale: 3.0,
        output_quality: 85,
        prompt_upsampling: false,
        enable_upscaling: false
      };
    case 'high':
      return {
        num_inference_steps: 50,
        guidance_scale: 3.5,
        output_quality: 95,
        prompt_upsampling: true,
        enable_upscaling: true
      };
    case 'ultra':
      return {
        num_inference_steps: 75,
        guidance_scale: 4.0,
        output_quality: 100,
        prompt_upsampling: true,
        enable_upscaling: true
      };
    default:
      return {
        num_inference_steps: 50,
        guidance_scale: 3.5,
        output_quality: 95,
        prompt_upsampling: true,
        enable_upscaling: true
      };
  }
}

// Recraft Crisp Upscale function with enhanced timeout and retry logic
async function upscaleImage(imageUrl: string, sessionId: string, outfitIndex: number, maxRetries: number = 3) {
  let lastError: Error | null = null;
  
  const timeout = 120000; // 2 minutes timeout
  const baseDelay = 5000; // 5 seconds base delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Inngest] 🔄 Starting Recraft Crisp Upscale for session ${sessionId}, outfit ${outfitIndex + 1} - Attempt ${attempt}/${maxRetries}`);
      console.log(`[Inngest] 📊 Parameters: Timeout: ${timeout/1000}s`);
      console.log(`[Inngest] 🖼️ Input image: ${imageUrl}`);
      
      // Create upscaling promise with proper input validation
      const upscalePromise = replicate.run(
        "recraft-ai/recraft-crisp-upscale",
        {
          input: {
            image: imageUrl
          }
        }
      );
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Recraft Crisp Upscale timed out after ${timeout/1000} seconds`)), timeout)
      );
      
      // Race between upscaling and timeout
      const output = await Promise.race([upscalePromise, timeoutPromise]);

      // Validate output
      if (!output || typeof output !== 'string') {
        throw new Error('Recraft Crisp Upscale did not return a valid image URL');
      }

      // Validate that returned URL is accessible
      if (!output.startsWith('http')) {
        throw new Error(`Recraft Crisp Upscale returned invalid URL format: ${output}`);
      }

      console.log(`[Inngest] ✅ Successfully upscaled image for session ${sessionId}, outfit ${outfitIndex + 1} on attempt ${attempt}`);
      console.log(`[Inngest] 🎯 Upscaled image URL: ${output}`);
      return output;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Inngest] ⚠️ Recraft Crisp Upscale attempt ${attempt}/${maxRetries} failed for session ${sessionId}, outfit ${outfitIndex + 1}:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff with base delay: 5s, 10s, 20s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[Inngest] 🔄 Retrying Recraft Crisp Upscale in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[Inngest] ❌ All Recraft Crisp Upscale attempts failed for session ${sessionId}, outfit ${outfitIndex + 1}. Final error:`, lastError?.message);
  throw lastError || new Error('Unknown upscaling error');
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
  quality?: string;
  constraints?: string;
  textDescription?: string;
}

// Main Inngest function for fashion analysis workflow
export const generateFashionRecommendations = inngest.createFunction(
  { id: "generate-fashion-recommendations", concurrency: { limit: 5 } },
  { event: "fashion/analysis.requested" },
  async ({ event, step }: { event: { data: FashionAnalysisRequestedData }; step: unknown }) => {
    const { userId, sessionId, photoUrl, userPreferences, occasion, quality = 'high', constraints, textDescription } = event.data;
    const startTime = Date.now();
    
    console.log(`[Inngest] ===============================================`);
    console.log(`[Inngest] STARTING FASHION ANALYSIS WORKFLOW`);
    console.log(`[Inngest] Session ID: ${sessionId}`);
    console.log(`[Inngest] User ID: ${userId}`);
    console.log(`[Inngest] Photo URL: ${photoUrl}`);
    console.log(`[Inngest] Occasion: ${occasion}`);
    console.log(`[Inngest] Quality: ${quality}`);
    console.log(`[Inngest] Constraints: ${constraints || 'None'}`);
    console.log(`[Inngest] Text Description: ${textDescription || 'None'}`);
    console.log(`[Inngest] User Preferences:`, JSON.stringify(userPreferences, null, 2));
    console.log(`[Inngest] ===============================================`);
    
    if (!userId || !sessionId || !photoUrl || !userPreferences || !occasion) {
      const missingFields = {
        userId: !!userId,
        sessionId: !!sessionId,
        photoUrl: !!photoUrl,
        userPreferences: !!userPreferences,
        occasion: !!occasion
      };
      console.error(`[Inngest] CRITICAL ERROR - Missing required data for session ${sessionId}:`, missingFields);
      throw new Error(`Missing required data in event payload: ${JSON.stringify(missingFields)}`);
    }

    function assertStepHasRun(s: unknown): asserts s is { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> } {
      if (!s || typeof s !== 'object' || typeof (s as { run?: unknown }).run !== 'function') {
        throw new Error('step.run is not available');
      }
    }
    assertStepHasRun(step);

    // Step 1: Analyze Photo with Fashion Analysis Agent
    console.log(`[Inngest] STEP 1: Starting photo analysis for session ${sessionId}`);
    const step1StartTime = Date.now();
    
    const analysisResultUnknown = await step.run("analyze-photo", async () => {
      try {
        console.log(`[Inngest] Calling analyzeFashionPhoto function...`);
        const result = await analyzeFashionPhoto(photoUrl, userPreferences, occasion, constraints, sessionId, textDescription);
        console.log(`[Inngest] Photo analysis completed successfully in ${Date.now() - step1StartTime}ms`);
        return result;
      } catch (error) {
        console.error(`[Inngest] STEP 1 FAILED - Photo analysis error:`, error);
        throw error;
      }
    });
    
    if (typeof analysisResultUnknown !== 'string') {
      console.error(`[Inngest] STEP 1 FAILED - Invalid analysis result type:`, typeof analysisResultUnknown);
      throw new Error(`Fashion analysis agent returned invalid type: ${typeof analysisResultUnknown}`);
    }
    const analysisResult = analysisResultUnknown;
    console.log(`[Inngest] STEP 1 COMPLETED - Analysis result length: ${analysisResult.length} characters`);

    // Step 2: Generate Outfit Recommendations
    console.log(`[Inngest] STEP 2: Starting outfit recommendations for session ${sessionId}`);
    const step2StartTime = Date.now();
    
    const recommendationsUnknown = await step.run("generate-recommendations", async () => {
      try {
        console.log(`[Inngest] Calling generateOutfitRecommendations function...`);
        const result = await generateOutfitRecommendations(analysisResult, userPreferences, occasion, userPreferences.budget, sessionId);
        console.log(`[Inngest] Outfit recommendations completed successfully in ${Date.now() - step2StartTime}ms`);
        return result;
      } catch (error) {
        console.error(`[Inngest] STEP 2 FAILED - Outfit recommendations error:`, error);
        throw error;
      }
    });
    
    if (typeof recommendationsUnknown !== 'string') {
      console.error(`[Inngest] STEP 2 FAILED - Invalid recommendations result type:`, typeof recommendationsUnknown);
      throw new Error(`Outfit recommendation agent returned invalid type: ${typeof recommendationsUnknown}`);
    }
    const recommendations = recommendationsUnknown;
    console.log(`[Inngest] STEP 2 COMPLETED - Recommendations result length: ${recommendations.length} characters`);

    // Step 3: Generate Visualization Images with Flux-kontext
    console.log(`[Inngest] STEP 3: Starting outfit visualizations for session ${sessionId}`);
    const step3StartTime = Date.now();
    
    const visualizationsUnknown = await step.run("generate-visualizations", async () => {
      try {
        console.log(`[Inngest] Parsing recommendations JSON...`);
        const parsedRecommendations = JSON.parse(extractJsonFromMarkdown(recommendations));
        console.log(`[Inngest] Parsed recommendations:`, JSON.stringify(parsedRecommendations, null, 2));
        
        console.log(`[Inngest] Calling generateOutfitVisualizations function...`);
        const result = await generateOutfitVisualizations(photoUrl, parsedRecommendations, sessionId, userPreferences, occasion, quality);
        console.log(`[Inngest] Outfit visualizations completed successfully in ${Date.now() - step3StartTime}ms`);
        return result;
      } catch (error) {
        console.error(`[Inngest] STEP 3 FAILED - Outfit visualizations error:`, error);
        // Don't throw error - continue with empty visualizations to avoid blocking the workflow
        console.log(`[Inngest] Continuing with empty visualizations to prevent workflow failure`);
        return { visualizations: [] };
      }
    });
    
    const visualizations = visualizationsUnknown as { visualizations: Array<{ outfit_name: string; visualization?: { image_url: string }; error?: string }> };
    console.log(`[Inngest] STEP 3 COMPLETED - Generated ${visualizations?.visualizations?.length || 0} visualizations`);

    // Step 4: Save Results to Blob Storage
    console.log(`[Inngest] STEP 4: Starting results save for session ${sessionId}`);
    console.log(`[Inngest] STEP 4: Preparing to save results to blob storage`);
    const step4StartTime = Date.now();
    
    const resultsData = {
      userId,
      sessionId,
      originalPhoto: photoUrl,
      analysis: JSON.parse(extractJsonFromMarkdown(analysisResult)),
      recommendations: JSON.parse(extractJsonFromMarkdown(recommendations)),
      visualizations: visualizations.visualizations || [],
      timestamp: new Date().toISOString(),
      userPreferences,
      occasion,
      constraints,
      processing_time_ms: Date.now() - startTime,
      step_times: {
        photo_analysis: step1StartTime ? Date.now() - step1StartTime : 0,
        recommendations: step2StartTime ? Date.now() - step2StartTime : 0,
        visualizations: step3StartTime ? Date.now() - step3StartTime : 0
      }
    };

    const blobKey = `fashion-results/${userId}/${sessionId}.json`;
    console.log(`[Inngest] STEP 4: Blob key generated: ${blobKey}`);
    console.log(`[Inngest] STEP 4: Results data size: ${JSON.stringify(resultsData).length} bytes`);
    console.log(`[Inngest] STEP 4: Results data preview:`, {
      userId: resultsData.userId,
      sessionId: resultsData.sessionId,
      timestamp: resultsData.timestamp,
      hasAnalysis: !!resultsData.analysis,
      hasRecommendations: !!resultsData.recommendations,
      visualizationCount: resultsData.visualizations.length
    });
    
    const savedResultsUnknown = await step.run("save-results", async () => {
      try {
        console.log(`[Inngest] STEP 4: Inside step.run - calling saveFashionResults...`);
        console.log(`[Inngest] STEP 4: About to stringify results data`);
        const stringifiedData = JSON.stringify(resultsData, null, 2);
        console.log(`[Inngest] STEP 4: Stringified data length: ${stringifiedData.length}`);
        console.log(`[Inngest] STEP 4: First 200 chars of stringified data:`, stringifiedData.substring(0, 200));
        
        const result = await saveFashionResults(blobKey, stringifiedData, sessionId);
        console.log(`[Inngest] STEP 4: saveFashionResults returned:`, result);
        console.log(`[Inngest] STEP 4: Results saved successfully in ${Date.now() - step4StartTime}ms`);
        return result;
      } catch (error) {
        console.error(`[Inngest] STEP 4 FAILED - Results save error:`, error);
        console.error(`[Inngest] STEP 4 FAILED - Error type:`, error?.constructor?.name);
        console.error(`[Inngest] STEP 4 FAILED - Error message:`, error instanceof Error ? error.message : String(error));
        console.error(`[Inngest] STEP 4 FAILED - Error stack:`, error instanceof Error ? error.stack : 'No stack');
        throw error;
      }
    });
    
    console.log(`[Inngest] STEP 4: Validating blob save result...`);
    console.log(`[Inngest] STEP 4: savedResultsUnknown type:`, typeof savedResultsUnknown);
    console.log(`[Inngest] STEP 4: savedResultsUnknown value:`, JSON.stringify(savedResultsUnknown, null, 2));
    
    if (!savedResultsUnknown || typeof savedResultsUnknown !== 'object' || typeof (savedResultsUnknown as { url?: unknown }).url !== 'string') {
      console.error(`[Inngest] STEP 4 FAILED - Invalid blob result:`, savedResultsUnknown);
      console.error(`[Inngest] STEP 4 FAILED - Expected object with url property, got:`, {
        type: typeof savedResultsUnknown,
        hasUrl: savedResultsUnknown && typeof savedResultsUnknown === 'object' ? 'url' in savedResultsUnknown : false,
        urlType: savedResultsUnknown && typeof savedResultsUnknown === 'object' && 'url' in savedResultsUnknown ? typeof (savedResultsUnknown as any).url : 'N/A'
      });
      throw new Error(`Blob result missing url. Got: ${JSON.stringify(savedResultsUnknown)}`);
    }
    const savedResults = savedResultsUnknown as { url: string };
    console.log(`[Inngest] STEP 4 COMPLETED - Results saved successfully!`);
    console.log(`[Inngest] STEP 4 COMPLETED - Blob URL: ${savedResults.url}`);
    console.log(`[Inngest] STEP 4 COMPLETED - Blob key was: ${blobKey}`);

    const totalTime = Date.now() - startTime;
    console.log(`[Inngest] ===============================================`);
    console.log(`[Inngest] WORKFLOW COMPLETED SUCCESSFULLY`);
    console.log(`[Inngest] Session ID: ${sessionId}`);
    console.log(`[Inngest] Total processing time: ${totalTime}ms`);
    console.log(`[Inngest] Results URL: ${savedResults.url}`);
    console.log(`[Inngest] Visualizations generated: ${visualizations.visualizations?.length || 0}`);
    console.log(`[Inngest] ===============================================`);
    
    return { 
      success: true,
      sessionId,
      resultsUrl: savedResults.url,
      analysis: JSON.parse(extractJsonFromMarkdown(analysisResult)),
      recommendations: JSON.parse(extractJsonFromMarkdown(recommendations)),
      visualizations: visualizations.visualizations || [],
      processing_time_ms: totalTime,
      message: `Fashion recommendations and visualizations generated for session ${sessionId} in ${totalTime}ms` 
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
  
  console.log(`[Inngest] Starting photo analysis for session ${sessionId}`);
  console.log(`[Inngest] Fashion agent URL: ${fashionAgentUrl}`);
  console.log(`[Inngest] Photo URL: ${photoUrl}`);
  
  try {
    // Use Google ADK agent for photo analysis
    const requestBody = { 
      photo_url: photoUrl,
      user_preferences: userPreferences,
      occasion: occasion,
      constraints: constraints,
      text_description: textDescription
    };
    
    console.log(`[Inngest] Sending request to analyze-photo endpoint:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${fashionAgentUrl}/analyze-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Inngest] Photo analysis response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Inngest] Fashion analysis request failed for session ${sessionId}. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`Fashion analysis request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Inngest] Photo analysis response data:`, JSON.stringify(data, null, 2));
    
    const analysis = data.analysis;
    
    if (!analysis) {
      console.error(`[Inngest] Fashion analysis agent returned no analysis content for session ${sessionId}`);
      throw new Error('Fashion analysis agent returned no analysis content');
    }

    console.log(`[Inngest] Photo analysis completed successfully for session ${sessionId}`);
    return analysis;
  } catch (error) {
    console.error(`[Inngest] Fashion analysis error for session ${sessionId}:`, error instanceof Error ? error.message : String(error));
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
  
  console.log(`[Inngest] Starting outfit recommendations for session ${sessionId}`);
  console.log(`[Inngest] Fashion agent URL: ${fashionAgentUrl}`);
  
  try {
    // Use Google ADK agent for outfit recommendations
    const requestBody = { 
      analysis_result: analysisResult,
      user_preferences: userPreferences,
      occasion: occasion,
      budget_range: budgetRange
    };
    
    console.log(`[Inngest] Sending request to recommend-outfit endpoint:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${fashionAgentUrl}/recommend-outfit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Inngest] Outfit recommendations response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Inngest] Outfit recommendation request failed for session ${sessionId}. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`Outfit recommendation request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Inngest] Outfit recommendations response data:`, JSON.stringify(data, null, 2));
    
    const recommendations = data.recommendations;
    
    if (!recommendations) {
      console.error(`[Inngest] Outfit recommendation agent returned no recommendations content for session ${sessionId}`);
      throw new Error('Outfit recommendation agent returned no recommendations content');
    }

    console.log(`[Inngest] Outfit recommendations completed successfully for session ${sessionId}`);
    return recommendations;
  } catch (error) {
    console.error(`[Inngest] Outfit recommendation error for session ${sessionId}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function generateOutfitVisualizations(
  userPhotoUrl: string,
  recommendations: Record<string, unknown>,
  sessionId: string,
  userPreferences?: Record<string, unknown>,
  occasion?: string,
  quality?: string
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
        
        // Get quality settings based on user selection
        const qualitySettings = getQualitySettings(quality || 'high');
        
        // Generate image using FLUX.1 Kontext-max with quality-specific parameters
        const output = await replicate.run(
          "black-forest-labs/flux-kontext-max",
          {
            input: {
              prompt: prompt,
              input_image: userPhotoUrl,
              aspect_ratio: "3:4",
              output_format: "jpg",
              output_quality: qualitySettings.output_quality,
              safety_tolerance: 2,
              num_inference_steps: qualitySettings.num_inference_steps,
              guidance_scale: qualitySettings.guidance_scale,
              prompt_upsampling: qualitySettings.prompt_upsampling,
              seed: 42
            }
          }
        );
        
        if (output) {
          const replicateImageUrl = typeof output === 'string' ? output : (output as string[])[0];
          
          // Step 1: Upscale the generated image using Recraft Crisp Upscale (with fallback)
          let finalImageUrl: string;
          let finalWidth: number;
          let finalHeight: number;
          let upscaledUrl: string | undefined;
          let upscaleAttempted = false;
          let upscaleSuccessful = false;
          
          // Only attempt upscaling if enabled for this quality setting
          if (qualitySettings.enable_upscaling) {
            try {
              upscaleAttempted = true;
              console.log(`[Inngest] Starting Recraft Crisp Upscale process for session ${sessionId}, outfit ${i + 1}`);
              console.log(`[Inngest] Quality setting: ${quality} - Upscaling enabled`);
              
              upscaledUrl = await upscaleImage(
                replicateImageUrl, 
                sessionId, 
                i
              );
              
              finalImageUrl = upscaledUrl;
              finalWidth = 2048; // Recraft typically upscales to 2x or higher
              finalHeight = 3072;
              upscaleSuccessful = true;
              
              console.log(`[Inngest] Successfully upscaled image to ${finalWidth}x${finalHeight} for session ${sessionId}, outfit ${i + 1}`);
            } catch (upscaleError) {
              console.warn(`[Inngest] Recraft Crisp Upscale failed for session ${sessionId}, outfit ${i + 1}, using original image:`, upscaleError instanceof Error ? upscaleError.message : String(upscaleError));
              finalImageUrl = replicateImageUrl;
              finalWidth = 1024;
              finalHeight = 1536;
              upscaleSuccessful = false;
            }
          } else {
            console.log(`[Inngest] Upscaling disabled for ${quality} quality - using original image for session ${sessionId}, outfit ${i + 1}`);
            finalImageUrl = replicateImageUrl;
            finalWidth = 1024;
            finalHeight = 1536;
          }
          
          // Step 2: Download and save the final image to blob storage for permanent access
          try {
            console.log(`[Inngest] Downloading final image for session ${sessionId}, outfit ${i + 1}`);
            const imageResponse = await fetch(finalImageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.status}`);
            }
            
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageKey = `fashion-visualizations/${sessionId}/outfit-${i + 1}.jpg`;
            
            const savedImage = await put(imageKey, imageBuffer, {
              access: "public",
              contentType: "image/jpeg",
              token: FASHION_BLOB_TOKEN,
              allowOverwrite: true,
            });
            
            console.log(`[Inngest] Successfully saved final image to blob storage: ${savedImage.url}`);
            
            generated_visualizations.push({
              outfit_name: outfit.name as string || `Outfit ${i + 1}`,
              visualization: {
                image_url: savedImage.url,  // Use permanent blob URL instead of Replicate URL
                replicate_url: replicateImageUrl,  // Keep original FLUX URL for reference
                upscaled_url: upscaledUrl,  // Keep upscaled URL for reference (if upscaling was attempted)
                width: finalWidth,
                height: finalHeight,
                blob_key: imageKey,
                upscale_method: upscaleSuccessful ? 'recraft-crisp-upscale' : 'none',
                upscale_attempted: upscaleAttempted,
                upscale_successful: upscaleSuccessful
              },
              outfit_data: outfit
            });
            
            const upscaleStatus = upscaleAttempted ? (upscaleSuccessful ? 'Recraft Crisp upscaled' : 'upscaling failed, using original') : 'no upscaling (standard quality)';
            console.log(`[Inngest] Successfully generated and saved visualization ${i + 1} for session ${sessionId} - ${upscaleStatus}`);
          } catch (downloadError) {
            console.error(`[Inngest] Failed to download/save final image for session ${sessionId}, outfit ${i + 1}:`, downloadError instanceof Error ? downloadError.message : String(downloadError));
            // Fallback to original Replicate URL if download fails
            generated_visualizations.push({
              outfit_name: outfit.name as string || `Outfit ${i + 1}`,
              visualization: {
                image_url: replicateImageUrl,
                replicate_url: replicateImageUrl,
                width: 1024,
                height: 1536,
                download_error: downloadError instanceof Error ? downloadError.message : String(downloadError),
                upscale_method: 'none',
                upscale_attempted: upscaleAttempted,
                upscale_successful: false
              },
              outfit_data: outfit
            });
          }
        } else {
          console.warn(`[Inngest] No output from Replicate for outfit ${i + 1} in session ${sessionId}`);
          generated_visualizations.push({
            outfit_name: outfit.name as string || `Outfit ${i + 1}`,
            error: "Failed to generate visualization - Replicate returned no output",
            outfit_data: outfit
          });
        }
      } catch (error) {
        console.error(`[Inngest] Failed to generate visualization for outfit ${i + 1} in session ${sessionId}:`, error instanceof Error ? error.message : String(error));
        generated_visualizations.push({
          outfit_name: outfit.name as string || `Outfit ${i + 1}`,
          error: `Visualization generation failed: ${error instanceof Error ? error.message : String(error)}`,
          outfit_data: outfit,
          error_details: {
            step: 'flux_generation',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    const successful_visualizations = generated_visualizations.filter(v => 'visualization' in v).length;
    const failed_visualizations = generated_visualizations.filter(v => 'error' in v).length;
    
    console.log(`[Inngest] Visualization generation completed for session ${sessionId}:`);
    console.log(`[Inngest] - Successful: ${successful_visualizations}`);
    console.log(`[Inngest] - Failed: ${failed_visualizations}`);
    console.log(`[Inngest] - Total processed: ${generated_visualizations.length}`);
    
    return {
      visualizations: generated_visualizations,
      total_generated: successful_visualizations,
      total_failed: failed_visualizations,
      summary: {
        total_outfits: outfitRecommendations.length,
        successful_visualizations,
        failed_visualizations,
        success_rate: outfitRecommendations.length > 0 ? (successful_visualizations / outfitRecommendations.length * 100).toFixed(1) + '%' : '0%'
      }
    };
  } catch (error) {
    console.error(`[Inngest] Critical error in outfit visualization generation for session ${sessionId}:`, error instanceof Error ? error.message : String(error));
    // Don't throw error - continue without visualizations to prevent workflow failure
    return { 
      visualizations: [], 
      total_generated: 0, 
      total_failed: 0,
      critical_error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function saveFashionResults(blobKey: string, resultsContent: string, sessionId: string) {
  console.log(`[Inngest] STEP 4 DEBUG: Starting blob save process`);
  console.log(`[Inngest] Starting to save fashion results for session ${sessionId}`);
  console.log(`[Inngest] Blob key: ${blobKey}`);
  console.log(`[Inngest] Content size: ${resultsContent?.length || 0} characters`);
  console.log(`[Inngest] Content type: ${typeof resultsContent}`);
  console.log(`[Inngest] FASHION_BLOB_TOKEN exists: ${!!FASHION_BLOB_TOKEN}`);
  console.log(`[Inngest] FASHION_BLOB_TOKEN length: ${FASHION_BLOB_TOKEN?.length || 0}`);
  
  if (typeof resultsContent !== "string") {
    console.error(`[Inngest] Invalid content type for session ${sessionId}. Expected string, got ${typeof resultsContent}`);
    throw new Error(`Invalid content type for saving fashion results to blob: ${typeof resultsContent}`);
  }
  
  if (!FASHION_BLOB_TOKEN) {
    console.error(`[Inngest] Missing FASHION_BLOB_TOKEN for session ${sessionId}`);
    console.error(`[Inngest] Environment variables available:`, Object.keys(process.env).filter(k => k.includes('BLOB') || k.includes('TOKEN')).join(', '));
    throw new Error('FASHION_BLOB_TOKEN is not configured');
  }
  
  try {
    console.log(`[Inngest] Attempting to upload to blob storage...`);
    console.log(`[Inngest] Blob put() parameters:`);
    console.log(`[Inngest]   - key: ${blobKey}`);
    console.log(`[Inngest]   - content length: ${resultsContent.length}`);
    console.log(`[Inngest]   - access: public`);
    console.log(`[Inngest]   - contentType: application/json`);
    console.log(`[Inngest]   - allowOverwrite: true`);
    console.log(`[Inngest]   - token exists: ${!!FASHION_BLOB_TOKEN}`);
    
    const blob = await put(blobKey, resultsContent, {
      access: "public",
      contentType: "application/json",
      token: FASHION_BLOB_TOKEN,
      allowOverwrite: true,
    });
    
    console.log(`[Inngest] Blob put() returned:`, JSON.stringify(blob, null, 2));
    console.log(`[Inngest] Successfully saved fashion results to blob for session ${sessionId}`);
    console.log(`[Inngest] Blob URL: ${blob.url}`);
    console.log(`[Inngest] Blob pathname: ${(blob as any).pathname || 'N/A'}`);
    console.log(`[Inngest] Blob size: ${(blob as any).size || 'N/A'}`);
    console.log(`[Inngest] Blob saved successfully`);
    
    return blob;
  } catch (error) {
    console.error(`[Inngest] CRITICAL: Error saving fashion results to blob for session ${sessionId}:`);
    console.error(`[Inngest] Error type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`[Inngest] Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[Inngest] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`[Inngest] Full error object:`, error);
    throw error;
  }
}
