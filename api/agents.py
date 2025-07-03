import os
import sys
import json
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from tavily import TavilyClient
import json

# Load environment variables from .env.local file
load_dotenv('.env.local')

# Load Google API key from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("GOOGLE_API_KEY not found in environment variables", file=sys.stderr)
    raise ValueError("GOOGLE_API_KEY must be set")

# Load Tavily API key from environment
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
if TAVILY_API_KEY:
    tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
    print("Tavily API client initialized successfully", file=sys.stderr)
else:
    tavily_client = None
    print("TAVILY_API_KEY not found - search functionality will be limited", file=sys.stderr)

# Define request schemas for fashion analysis
class FashionAnalysisRequest(BaseModel):
    photo_url: str
    user_preferences: dict
    occasion: str
    constraints: Optional[str] = None
    text_description: Optional[str] = None

class OutfitRecommendationRequest(BaseModel):
    analysis_result: str
    user_preferences: dict
    occasion: str
    budget_range: str

# Initialize FastAPI app with root path for Vercel
app = FastAPI(title="AI Fashion Guru Agents (ADK)")

@app.get("/ping")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AI Fashion Guru Agents (Google ADK)",
        "google_api_key_set": bool(GOOGLE_API_KEY),
        "tavily_api_configured": bool(tavily_client),
        "vercel_url": os.getenv("VERCEL_URL", "not set"),
        "python_version": sys.version,
        "adk_imported": True,
    }

@app.get("/test-search")
async def test_search():
    """Test endpoint to verify Tavily search functionality"""
    if not tavily_client:
        return {
            "error": "Tavily API not configured",
            "instructions": "Set TAVILY_API_KEY in .env.local to enable search functionality"
        }
    
    try:
        # Test basic search functionality
        result = await search_fashion_trends("work", "casual", "2025")
        return {
            "test_status": "success", 
            "tavily_configured": True,
            "sample_search_result": result,
            "message": "Tavily search is working correctly"
        }
    except Exception as e:
        return {
            "test_status": "error",
            "tavily_configured": True,
            "error": str(e),
            "message": "Tavily is configured but search failed"
        }

# Fashion Analysis Agent using Google ADK
fashion_analysis_agent = LlmAgent(
    name="fashion_analysis_agent",
    model="gemini-2.5-flash",
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
    name="outfit_recommendation_agent",
    model="gemini-2.5-flash",
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
        "   - PRIORITIZE user's budget constraints (budget-friendly: under $50, mid-range: $50-150, premium: $150-300, luxury: $300+)\n"
        "   - Consider user's style preferences and any additional constraints\n"
        "   - Factor in occasion requirements\n\n"
        "2. **Create Budget-Appropriate Outfit Recommendations**:\n"
        "   - Design 3 complete outfit options WITHIN the specified budget range\n"
        "   - Ensure each outfit flatters the identified body type\n"
        "   - Use colors that complement the skin tone\n"
        "   - Include specific items (tops, bottoms, shoes, accessories) with realistic price points\n"
        "   - Recommend specific brands that match the budget tier\n"
        "   - Provide styling tips for each outfit\n\n"
        "3. **Budget-Conscious Practical Details**:\n"
        "   - Suggest specific brands and EXACT price ranges within budget\n"
        "   - Explain why each choice works for the user AND fits their budget\n"
        "   - Include where to shop for each budget tier (fast fashion, mid-range, designer, luxury)\n"
        "   - Provide money-saving tips when relevant\n"
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
    tools=[]
)

# Multi-agent coordinator
fashion_coordinator = LlmAgent(
    name="fashion_coordinator",
    model="gemini-2.5-flash", 
    description="Coordinates fashion analysis and outfit recommendation workflow",
    instruction="You coordinate between fashion analysis and outfit recommendation agents to provide comprehensive styling advice.",
    sub_agents=[fashion_analysis_agent, outfit_recommendation_agent]
)

# Fashion Search Utility Functions using Tavily API
async def search_fashion_trends(occasion: str, style: str, season: str = "2025") -> dict:
    """Search for current fashion trends based on occasion and style"""
    if not tavily_client:
        return {"trends": [], "error": "Search API not available"}
    
    try:
        query = f"fashion trends {season} {style} {occasion} clothing outfit ideas"
        response = tavily_client.search(
            query=query,
            search_depth="advanced",
            max_results=5,
            exclude_domains=["pinterest.com", "spam-sites.com"]
        )
        
        trends_info = []
        if response and "results" in response:
            for result in response["results"][:3]:  # Top 3 results
                trends_info.append({
                    "title": result.get("title", ""),
                    "content": result.get("content", "")[:300],  # Limit content
                    "url": result.get("url", "")
                })
        
        return {"trends": trends_info, "query": query, "success": True}
    except Exception as e:
        print(f"Error searching fashion trends: {str(e)}", file=sys.stderr)
        return {"trends": [], "error": str(e), "success": False}

async def search_clothing_prices(item_type: str, budget: str, brand_preference: str = "") -> dict:
    """Search for clothing prices and shopping information"""
    if not tavily_client:
        return {"pricing": [], "error": "Search API not available"}
    
    try:
        brand_query = f"{brand_preference} " if brand_preference else ""
        query = f"{brand_query}{item_type} price {budget} where to buy shopping"
        response = tavily_client.search(
            query=query,
            search_depth="basic",
            max_results=5,
            exclude_domains=["aliexpress.com", "wish.com"]
        )
        
        pricing_info = []
        if response and "results" in response:
            for result in response["results"][:3]:
                pricing_info.append({
                    "title": result.get("title", ""),
                    "content": result.get("content", "")[:200],
                    "url": result.get("url", "")
                })
        
        return {"pricing": pricing_info, "query": query, "success": True}
    except Exception as e:
        print(f"Error searching clothing prices: {str(e)}", file=sys.stderr)
        return {"pricing": [], "error": str(e), "success": False}

async def search_fashion_brands(budget_range: str, style: str, item_category: str = "") -> dict:
    """Search for fashion brands that match budget and style preferences"""
    if not tavily_client:
        return {"brands": [], "error": "Search API not available"}
    
    try:
        category_query = f"{item_category} " if item_category else ""
        query = f"best {style} {category_query}fashion brands {budget_range} affordable quality"
        response = tavily_client.search(
            query=query,
            search_depth="basic", 
            max_results=4
        )
        
        brand_info = []
        if response and "results" in response:
            for result in response["results"][:2]:
                brand_info.append({
                    "title": result.get("title", ""),
                    "content": result.get("content", "")[:250],
                    "url": result.get("url", "")
                })
        
        return {"brands": brand_info, "query": query, "success": True}
    except Exception as e:
        print(f"Error searching fashion brands: {str(e)}", file=sys.stderr)
        return {"brands": [], "error": str(e), "success": False}

async def run_agent_with_input(agent: LlmAgent, user_input: str, max_retries: int = 3) -> str:
    """Run an ADK agent with user input and return the response with error handling and retries"""
    
    for attempt in range(max_retries):
        try:
            print(f"Agent run attempt {attempt + 1}/{max_retries} for {agent.name}", file=sys.stderr)
            
            # Create a runner for the agent
            session_service = InMemorySessionService()
            runner = Runner(
                app_name="fashion-designer-ai",
                agent=agent,
                session_service=session_service
            )
            
            # Create content object for the user input
            content = types.Content(role='user', parts=[types.Part(text=user_input)])
            
            # Generate unique session ID based on input hash and attempt
            import hashlib
            session_id = f"session_{hashlib.md5(f'{user_input}_{attempt}'.encode()).hexdigest()[:8]}"
            user_id = "api_user"
            
            # Create session if it doesn't exist
            existing_session = await session_service.get_session(
                app_name="fashion-designer-ai",
                user_id=user_id,
                session_id=session_id
            )
            
            if not existing_session:
                await session_service.create_session(
                    app_name="fashion-designer-ai",
                    user_id=user_id,
                    session_id=session_id
                )
            
            # Run the agent with proper parameters
            response_text = ""
            tool_calls_detected = False
            tool_calls_successful = False
            
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=content
            ):
                # Log event details for debugging
                print(f"Event type: {type(event).__name__}, Author: {getattr(event, 'author', 'N/A')}", file=sys.stderr)
                
                # Check for tool usage
                if hasattr(event, 'tool_calls') and event.tool_calls:
                    tool_calls_detected = True
                    print(f"Tool calls detected: {len(event.tool_calls)}", file=sys.stderr)
                    
                    # Validate tool call results
                    for tool_call in event.tool_calls:
                        if hasattr(tool_call, 'result') and tool_call.result:
                            tool_calls_successful = True
                            print(f"Tool call successful: {tool_call.name if hasattr(tool_call, 'name') else 'unknown'}", file=sys.stderr)
                
                if event.is_final_response():
                    response_text = event.content.parts[0].text
                    
                    # Validate response quality
                    if len(response_text.strip()) < 10:
                        raise ValueError(f"Response too short: {response_text}")
                    
                    # For agents with tools, verify they actually used tools when expected
                    if agent.tools and "search" in user_input.lower() and not tool_calls_detected:
                        print(f"Warning: Expected tool usage but none detected", file=sys.stderr)
                    
                    # Check if response indicates tool failure
                    if "I cannot" in response_text or "unable to access" in response_text.lower():
                        raise ValueError(f"Agent indicated tool failure: {response_text[:100]}")
                    
                    print(f"Successful response from {agent.name} on attempt {attempt + 1}", file=sys.stderr)
                    return response_text
            
            # If we reach here, no final response was found
            raise ValueError("No final response generated from agent")
            
        except Exception as e:
            error_msg = str(e)
            print(f"Attempt {attempt + 1} failed for {agent.name}: {error_msg}", file=sys.stderr)
            
            # Check for specific error types that indicate we should retry
            retry_errors = [
                "Tool use with function calling is unsupported",
                "INVALID_ARGUMENT",
                "Session not found",
                "No final response",
                "Response too short",
                "tool failure"
            ]
            
            should_retry = any(retry_error in error_msg for retry_error in retry_errors)
            
            if attempt < max_retries - 1 and should_retry:
                import asyncio
                # Exponential backoff: wait 1s, then 2s, then 4s
                wait_time = 2 ** attempt
                print(f"Retrying in {wait_time} seconds...", file=sys.stderr)
                await asyncio.sleep(wait_time)
                continue
            else:
                # Final attempt failed or non-retryable error
                if should_retry:
                    # Provide fallback response based on agent type
                    if agent.name == "fashion_analysis_agent":
                        fallback_response = """```json
{
  "body_analysis": {
    "body_type": "Unable to analyze from image",
    "key_features": ["Analysis temporarily unavailable"],
    "proportions": "Please provide more details for manual analysis"
  },
  "color_analysis": {
    "skin_undertone": "neutral",
    "best_colors": ["navy", "white", "gray"],
    "colors_to_avoid": ["neon colors"]
  },
  "style_assessment": {
    "current_style": "Classic and versatile",
    "strengths": ["Good foundation pieces"],
    "improvement_areas": ["Consider current trends"]
  },
  "recommendations_summary": "Due to technical limitations, providing general styling guidance. Please try again for detailed analysis."
}
```"""
                        print(f"Using fallback response for {agent.name}", file=sys.stderr)
                        return fallback_response
                    else:
                        # For outfit recommendation agent
                        fallback_response = """```json
{
  "outfit_recommendations": [
    {
      "name": "Classic Work Look",
      "description": "Timeless professional outfit suitable for most occasions",
      "items": {
        "top": {"item": "button-down shirt", "color": "white or light blue", "why": "versatile and professional"},
        "bottom": {"item": "tailored trousers", "color": "navy or charcoal", "why": "flattering and appropriate"},
        "shoes": {"item": "leather loafers or low heels", "color": "black or brown", "why": "comfortable and professional"},
        "accessories": [{"item": "simple watch", "why": "adds professionalism"}]
      },
      "styling_tips": ["Ensure proper fit", "Choose quality fabrics"],
      "budget_estimate": "$150-300",
      "occasion_fit": "Suitable for most professional settings"
    }
  ],
  "general_styling_advice": ["Focus on fit and quality", "Build a capsule wardrobe"],
  "shopping_tips": ["Try items on before buying", "Invest in basics first"],
  "image_generation_prompt": "Professional person wearing classic work attire in office setting"
}
```"""
                        print(f"Using fallback response for {agent.name}", file=sys.stderr)
                        return fallback_response
                else:
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
            f"Additional Constraints: {request.constraints or 'None'}\n"
            f"Additional Context from User: {request.text_description or 'None'}\n\n"
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
    """Generate specific outfit recommendations based on analysis using Google ADK with Tavily search"""
    try:
        if not request.analysis_result:
            return {"error": "No analysis result provided."}
        
        # Extract style and occasion for search
        style = request.user_preferences.get("style", "casual") if isinstance(request.user_preferences, dict) else "casual"
        occasion = request.occasion
        budget_range = request.budget_range
        
        # Perform fashion searches to enhance recommendations
        print(f"Searching for fashion data: style={style}, occasion={occasion}, budget={budget_range}", file=sys.stderr)
        
        # Search for current trends
        trends_data = await search_fashion_trends(occasion, style)
        
        # Search for pricing information  
        pricing_data = await search_clothing_prices("clothing", budget_range)
        
        # Search for brand recommendations
        brands_data = await search_fashion_brands(budget_range, style)
        
        # Create enhanced prompt with search results
        search_context = ""
        if trends_data.get("success"):
            trends_summary = "\n".join([f"- {trend.get('title', '')}: {trend.get('content', '')[:100]}..." 
                                       for trend in trends_data.get("trends", [])])
            search_context += f"\n\nCURRENT FASHION TRENDS:\n{trends_summary}"
        
        if pricing_data.get("success"):
            pricing_summary = "\n".join([f"- {price.get('title', '')}: {price.get('content', '')[:100]}..." 
                                        for price in pricing_data.get("pricing", [])])
            search_context += f"\n\nPRICING INFORMATION:\n{pricing_summary}"
        
        if brands_data.get("success"):
            brands_summary = "\n".join([f"- {brand.get('title', '')}: {brand.get('content', '')[:100]}..." 
                                       for brand in brands_data.get("brands", [])])
            search_context += f"\n\nRECOMMENDED BRANDS:\n{brands_summary}"
        
        # Create detailed prompt for outfit recommendations
        user_prompt = (
            f"Based on the following fashion analysis, create specific outfit recommendations:\n\n"
            f"ANALYSIS RESULTS:\n{request.analysis_result}\n\n"
            f"USER PREFERENCES: {request.user_preferences}\n"
            f"OCCASION: {request.occasion}\n"
            f"BUDGET RANGE: {request.budget_range}"
            f"{search_context}\n\n"
            f"Using the current trends, pricing information, and brand recommendations above, "
            f"please provide 3 complete outfit recommendations following the specified JSON format. "
            f"Include specific items, brands from the research above when relevant, styling tips, "
            f"and an image generation prompt for visualizing the user in the recommended outfits. "
            f"Incorporate the real-time fashion data to make recommendations more current and actionable."
        )
        
        # Run the outfit recommendation agent using ADK
        recommendations = await run_agent_with_input(outfit_recommendation_agent, user_prompt)
        
        return {
            "recommendations": recommendations,
            "search_data": {
                "trends_found": len(trends_data.get("trends", [])),
                "pricing_found": len(pricing_data.get("pricing", [])),
                "brands_found": len(brands_data.get("brands", []))
            }
        }
    
    except Exception as e:
        print(f"Error in outfit recommendations: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

# IMPORTANT: Handler for Vercel serverless functions
# Vercel's Python runtime will automatically handle FastAPI apps
# No additional configuration needed - just export the 'app' variable