import os
import sys
import json
import base64
from io import BytesIO
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from PIL import Image
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("GOOGLE_API_KEY not found in environment variables", file=sys.stderr)
    raise ValueError("GOOGLE_API_KEY must be set")

genai.configure(api_key=GOOGLE_API_KEY)

# Define request schemas for fashion analysis
class GeminiFashionAnalysisRequest(BaseModel):
    photo_url: str
    user_preferences: dict
    occasion: str
    constraints: Optional[str] = None

class GeminiOutfitRecommendationRequest(BaseModel):
    analysis_result: str
    user_preferences: dict
    occasion: str
    budget_range: str

# Initialize FastAPI app
app = FastAPI(title="Gemini Fashion Agents", root_path="/api/gemini")

@app.get("/ping")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Gemini Fashion Agents",
        "google_api_key_set": bool(GOOGLE_API_KEY),
        "python_version": sys.version,
    }

def load_image_from_url(image_url: str) -> Image.Image:
    """Load image from URL for Gemini processing"""
    try:
        response = requests.get(image_url)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load image: {str(e)}")

@app.post("/analyze-photo")
async def analyze_photo_with_gemini(request: GeminiFashionAnalysisRequest):
    """Analyze uploaded photo using Gemini 2.5 Flash with vision capabilities"""
    try:
        # Load the image
        image = load_image_from_url(request.photo_url)
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Create comprehensive fashion analysis prompt
        analysis_prompt = f"""
        You are an expert fashion stylist and image analyst. Analyze this photo comprehensively for fashion styling purposes.

        User Context:
        - Style Preferences: {request.user_preferences}
        - Occasion: {request.occasion}
        - Additional Constraints: {request.constraints or 'None'}

        Please provide a detailed analysis in the following JSON format:

        {{
          "body_analysis": {{
            "body_type": "identified body type (pear, apple, hourglass, rectangle, inverted triangle)",
            "key_features": ["list of notable body features"],
            "proportions": "detailed description of body proportions",
            "posture_notes": "observations about posture and stance"
          }},
          "color_analysis": {{
            "skin_undertone": "warm/cool/neutral",
            "complexion_notes": "description of skin tone and complexion",
            "best_colors": ["list of 5-6 most flattering colors"],
            "colors_to_avoid": ["list of 3-4 colors to avoid"],
            "hair_color": "observed hair color if visible",
            "eye_color": "observed eye color if visible"
          }},
          "current_style_analysis": {{
            "current_outfit": "description of what they're wearing",
            "fit_assessment": "how well current clothes fit",
            "style_category": "current style category (casual, professional, etc.)",
            "strengths": ["what works well in current look"],
            "improvement_areas": ["areas that could be enhanced"]
          }},
          "body_proportion_advice": {{
            "silhouettes_to_emphasize": ["recommended silhouettes"],
            "areas_to_highlight": ["body areas to accentuate"],
            "styling_techniques": ["specific techniques for this body type"]
          }},
          "occasion_suitability": {{
            "current_appropriateness": "how suitable current look is for stated occasion",
            "needed_adjustments": ["adjustments needed for the occasion"]
          }},
          "recommendations_summary": "2-3 sentence summary of key styling recommendations"
        }}

        Analyze the image carefully and provide specific, actionable insights. Focus on:
        1. Accurate body type identification
        2. Precise color analysis based on skin tone
        3. Constructive assessment of current style
        4. Specific recommendations for the stated occasion
        5. Professional but encouraging tone

        Return only the JSON response, no additional text.
        """
        
        # Generate analysis with Gemini
        response = model.generate_content([analysis_prompt, image])
        
        # Parse and validate JSON response
        try:
            analysis_result = json.loads(response.text)
            return {"analysis": json.dumps(analysis_result)}
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw response
            return {"analysis": response.text}
            
    except Exception as e:
        print(f"Error in Gemini photo analysis: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/recommend-outfit")
async def recommend_outfit_with_gemini(request: GeminiOutfitRecommendationRequest):
    """Generate outfit recommendations using Gemini based on analysis"""
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Create outfit recommendation prompt
        recommendation_prompt = f"""
        You are a professional fashion stylist creating specific outfit recommendations based on the provided analysis.

        ANALYSIS RESULTS:
        {request.analysis_result}

        USER PREFERENCES: {request.user_preferences}
        OCCASION: {request.occasion}
        BUDGET RANGE: {request.budget_range}

        Create 3 complete, specific outfit recommendations in this JSON format:

        {{
          "outfit_recommendations": [
            {{
              "name": "Outfit name/theme",
              "description": "Overall look description (2-3 sentences)",
              "style_category": "style category (professional, casual, formal, etc.)",
              "items": {{
                "top": {{
                  "item": "specific garment (e.g., 'silk blouse', 'cotton t-shirt')",
                  "color": "specific color",
                  "style_details": "cut, fit, and style specifics",
                  "why": "explanation of why this works for user"
                }},
                "bottom": {{
                  "item": "specific garment",
                  "color": "specific color", 
                  "style_details": "cut, fit, and style specifics",
                  "why": "explanation of why this works for user"
                }},
                "shoes": {{
                  "item": "specific shoe type",
                  "color": "specific color",
                  "style_details": "heel height, style, etc.",
                  "why": "explanation of why this works for user"
                }},
                "outerwear": {{
                  "item": "jacket, blazer, cardigan, etc. (if needed)",
                  "color": "specific color",
                  "style_details": "cut and style details",
                  "why": "explanation of why this works"
                }},
                "accessories": [
                  {{
                    "item": "specific accessory",
                    "color": "color if applicable",
                    "why": "explanation of impact"
                  }}
                ]
              }},
              "styling_tips": ["specific styling technique 1", "specific styling technique 2"],
              "fit_notes": ["important fit considerations for this outfit"],
              "budget_estimate": "realistic price range based on requested budget",
              "occasion_appropriateness": "why this outfit works for the occasion",
              "shopping_suggestions": ["where to find these items", "what to look for when shopping"]
            }}
          ],
          "general_styling_principles": [
            "key principle 1 for this body type",
            "key principle 2 for color choices", 
            "key principle 3 for the occasion"
          ],
          "seasonal_considerations": "adjustments for current season",
          "care_and_maintenance": ["tips for maintaining recommended pieces"],
          "image_generation_prompt": "Detailed prompt for AI image generation showing the user in outfit 1"
        }}

        Guidelines:
        - Ensure recommendations flatter the identified body type
        - Use colors that complement the analyzed skin tone
        - Make recommendations specific and actionable
        - Include realistic budget considerations
        - Provide constructive styling education
        - Consider the specific occasion requirements

        Return only the JSON response, no additional text.
        """
        
        # Generate recommendations
        response = model.generate_content(recommendation_prompt)
        
        # Parse and validate JSON response
        try:
            recommendations = json.loads(response.text)
            return {"recommendations": json.dumps(recommendations)}
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw response
            return {"recommendations": response.text}
            
    except Exception as e:
        print(f"Error in Gemini outfit recommendations: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

# Export the app for Vercel
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)