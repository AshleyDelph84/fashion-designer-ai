import os
import sys
import json
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.core import Session
from google.adk.tools import google_search

# Load environment variables from .env file
load_dotenv()

# Load Google API key from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("GOOGLE_API_KEY not found in environment variables", file=sys.stderr)
    raise ValueError("GOOGLE_API_KEY must be set")

# Define request schemas for fashion analysis
class FashionAnalysisRequest(BaseModel):
    photo_url: str
    user_preferences: dict
    occasion: str
    constraints: Optional[str] = None

class OutfitRecommendationRequest(BaseModel):
    analysis_result: str
    user_preferences: dict
    occasion: str
    budget_range: str

# Initialize FastAPI app with root path for Vercel
app = FastAPI(title="AI Fashion Guru Agents (ADK)", root_path="/api/agents")

@app.get("/ping")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AI Fashion Guru Agents (Google ADK)",
        "google_api_key_set": bool(GOOGLE_API_KEY),
        "vercel_url": os.getenv("VERCEL_URL", "not set"),
        "python_version": sys.version,
        "adk_imported": True,
    }

# Fashion Analysis Agent using Google ADK
fashion_analysis_agent = LlmAgent(
    name="Fashion Analysis Agent",
    model="gemini-2.0-flash",
    description="Expert fashion stylist and image analyst specializing in body type assessment, color analysis, and style recommendations",
    instruction=(
        "You are an expert fashion stylist and image analyst with deep knowledge of body types, color theory, style principles, and current fashion trends.\n\n"
        "Your role is to analyze uploaded photos and provide comprehensive fashion analysis.\n\n"
        "ANALYSIS PROCESS:\n"
        "1. **Body Shape Analysis**:\n"
        "   - Assess body proportions (shoulders, waist, hips)\n"
        "   - Identify body type (pear, apple, hourglass, rectangle, inverted triangle)\n"
        "   - Note posture and overall silhouette\n"
        "   - Consider height proportions\n\n"
        "2. **Skin Tone Assessment**:\n"
        "   - Determine undertones (warm, cool, neutral)\n"
        "   - Assess overall complexion\n"
        "   - Identify most flattering color palette\n"
        "   - Note hair color and eye color if visible\n\n"
        "3. **Current Style Evaluation**:\n"
        "   - Analyze existing clothing choices\n"
        "   - Identify style preferences shown\n"
        "   - Assess fit and proportions of current outfit\n"
        "   - Note what works well and what could be improved\n\n"
        "4. **Professional Assessment**:\n"
        "   - Consider the specified occasion requirements\n"
        "   - Factor in user's stated style preferences\n"
        "   - Account for any constraints or requirements\n"
        "   - Assess lifestyle and practical considerations\n\n"
        "OUTPUT FORMAT (JSON):\n"
        "{\n"
        "  \"body_analysis\": {\n"
        "    \"body_type\": \"identified body type\",\n"
        "    \"key_features\": [\"feature1\", \"feature2\"],\n"
        "    \"proportions\": \"description of proportions\"\n"
        "  },\n"
        "  \"color_analysis\": {\n"
        "    \"skin_undertone\": \"warm/cool/neutral\",\n"
        "    \"best_colors\": [\"color1\", \"color2\", \"color3\"],\n"
        "    \"colors_to_avoid\": [\"color1\", \"color2\"]\n"
        "  },\n"
        "  \"style_assessment\": {\n"
        "    \"current_style\": \"description\",\n"
        "    \"strengths\": [\"strength1\", \"strength2\"],\n"
        "    \"improvement_areas\": [\"area1\", \"area2\"]\n"
        "  },\n"
        "  \"recommendations_summary\": \"Brief overview of styling direction\"\n"
        "}\n\n"
        "Be specific, professional, and constructive in your analysis. Return only the JSON response."
    ),
    tools=[]
)

# Outfit Recommendation Agent using Google ADK
outfit_recommendation_agent = LlmAgent(
    name="Outfit Recommendation Agent",
    model="gemini-2.0-flash",
    description="Professional fashion stylist creating specific outfit recommendations based on body analysis and user preferences",
    instruction=(
        "You are a professional fashion stylist who creates specific, actionable outfit recommendations based on body analysis, user preferences, and occasion requirements.\n\n"
        "Your expertise includes:\n"
        "- Current fashion trends and timeless style principles\n"
        "- Specific clothing items, brands, and where to find them\n"
        "- Styling techniques for different body types\n"
        "- Color coordination and pattern mixing\n"
        "- Occasion-appropriate dressing\n"
        "- Budget-conscious styling solutions\n\n"
        "RECOMMENDATION PROCESS:\n"
        "1. **Analyze Input Data**:\n"
        "   - Review the fashion analysis results\n"
        "   - Consider user's style preferences and constraints\n"
        "   - Factor in occasion and budget requirements\n\n"
        "2. **Create Outfit Recommendations**:\n"
        "   - Design 3 complete outfit options\n"
        "   - Ensure each outfit flatters the identified body type\n"
        "   - Use colors that complement the skin tone\n"
        "   - Include specific items (tops, bottoms, shoes, accessories)\n"
        "   - Provide styling tips for each outfit\n\n"
        "3. **Include Practical Details**:\n"
        "   - Suggest specific brands and price ranges\n"
        "   - Explain why each choice works for the user\n"
        "   - Offer alternatives for different budgets\n"
        "   - Include styling and fit tips\n\n"
        "OUTPUT FORMAT (JSON):\n"
        "{\n"
        "  \"outfit_recommendations\": [\n"
        "    {\n"
        "      \"name\": \"Outfit name/theme\",\n"
        "      \"description\": \"Overall look description\",\n"
        "      \"items\": {\n"
        "        \"top\": {\"item\": \"specific item\", \"color\": \"color\", \"why\": \"reasoning\"},\n"
        "        \"bottom\": {\"item\": \"specific item\", \"color\": \"color\", \"why\": \"reasoning\"},\n"
        "        \"shoes\": {\"item\": \"specific item\", \"color\": \"color\", \"why\": \"reasoning\"},\n"
        "        \"accessories\": [{\"item\": \"accessory\", \"why\": \"reasoning\"}]\n"
        "      },\n"
        "      \"styling_tips\": [\"tip1\", \"tip2\"],\n"
        "      \"budget_estimate\": \"price range\",\n"
        "      \"occasion_fit\": \"how it fits the occasion\"\n"
        "    }\n"
        "  ],\n"
        "  \"general_styling_advice\": [\"advice1\", \"advice2\"],\n"
        "  \"shopping_tips\": [\"tip1\", \"tip2\"],\n"
        "  \"image_generation_prompt\": \"Detailed description for AI image generation\"\n"
        "}\n\n"
        "Focus on practical, achievable recommendations that build confidence. Return only the JSON response."
    ),
    tools=[google_search]
)

# Multi-agent coordinator
fashion_coordinator = LlmAgent(
    name="Fashion Coordinator",
    model="gemini-2.0-flash", 
    description="Coordinates fashion analysis and outfit recommendation workflow",
    instruction="You coordinate between fashion analysis and outfit recommendation agents to provide comprehensive styling advice.",
    sub_agents=[fashion_analysis_agent, outfit_recommendation_agent]
)

async def run_agent_with_input(agent: LlmAgent, user_input: str) -> str:
    """Run an ADK agent with user input and return the response"""
    try:
        # Create a session for the agent
        session = Session()
        
        # Run the agent with the input
        result = await session.run_async(agent, user_input)
        
        # Extract the response
        if hasattr(result, 'content'):
            return result.content
        elif hasattr(result, 'text'):
            return result.text
        else:
            return str(result)
            
    except Exception as e:
        print(f"Error running agent: {str(e)}", file=sys.stderr)
        raise e

@app.post("/analyze-photo")
async def analyze_photo(request: FashionAnalysisRequest):
    """Analyze uploaded photo for fashion styling recommendations using Google ADK"""
    try:
        if not request.photo_url:
            return {"error": "No photo URL provided."}
        
        # Create detailed prompt for fashion analysis
        user_prompt = (
            f"Please analyze this photo for fashion styling purposes.\n\n"
            f"Photo URL: {request.photo_url}\n\n"
            f"User Preferences: {request.user_preferences}\n"
            f"Occasion: {request.occasion}\n"
            f"Additional Constraints: {request.constraints or 'None'}\n\n"
            f"Provide a comprehensive fashion analysis following the specified JSON format."
        )
        
        # Run the fashion analysis agent using ADK
        analysis_result = await run_agent_with_input(fashion_analysis_agent, user_prompt)
        
        return {"analysis": analysis_result}
    
    except Exception as e:
        print(f"Error in photo analysis: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/recommend-outfit")
async def recommend_outfit(request: OutfitRecommendationRequest):
    """Generate specific outfit recommendations based on analysis using Google ADK"""
    try:
        if not request.analysis_result:
            return {"error": "No analysis result provided."}
        
        # Create detailed prompt for outfit recommendations
        user_prompt = (
            f"Based on the following fashion analysis, create specific outfit recommendations:\n\n"
            f"ANALYSIS RESULTS:\n{request.analysis_result}\n\n"
            f"USER PREFERENCES: {request.user_preferences}\n"
            f"OCCASION: {request.occasion}\n"
            f"BUDGET RANGE: {request.budget_range}\n\n"
            f"Please provide 3 complete outfit recommendations following the specified JSON format. "
            f"Include specific items, brands, styling tips, and an image generation prompt for visualizing the user in the recommended outfits."
        )
        
        # Run the outfit recommendation agent using ADK
        recommendations = await run_agent_with_input(outfit_recommendation_agent, user_prompt)
        
        return {"recommendations": recommendations}
    
    except Exception as e:
        print(f"Error in outfit recommendations: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

# IMPORTANT: Handler for Vercel serverless functions
# Vercel's Python runtime will automatically handle FastAPI apps
# No additional configuration needed - just export the 'app' variable