import os
import replicate
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json

app = FastAPI()

# Configuration
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")
if not REPLICATE_API_TOKEN:
    raise ValueError("REPLICATE_API_TOKEN environment variable is required")

class OutfitVisualizationRequest(BaseModel):
    """Request model for outfit visualization generation"""
    user_photo_url: str
    outfit_description: str
    style_prompt: str
    background_setting: Optional[str] = "modern studio lighting"
    quality: Optional[str] = "high"

class GeneratedImageResponse(BaseModel):
    """Response model for generated images"""
    image_url: str
    width: int
    height: int

@app.get("/ping")
async def ping():
    """Health check endpoint"""
    return {"status": "healthy", "service": "flux-agents"}

@app.post("/generate-outfit-visualization")
async def generate_outfit_visualization(request: OutfitVisualizationRequest):
    """
    Generate outfit visualization using FLUX.1 Kontext via Replicate
    Takes user photo and outfit description, returns image of user wearing the outfit
    """
    try:
        # Construct the prompt specifically for outfit editing (NOT person generation)
        prompt = f"""Edit only the clothing in this image. Replace the current outfit with: {request.outfit_description}. 
        PRESERVE COMPLETELY: person's face, skin tone, body shape, pose, background, lighting.
        CHANGE ONLY: the clothing items to match the new outfit description.
        Style: {request.style_prompt}. Keep original photo quality and lighting."""
        
        # Generate image using FLUX.1 Kontext via Replicate with outfit editing parameters
        output = replicate.run(
            "black-forest-labs/flux-kontext-max",
            input={
                "prompt": prompt,
                "image": request.user_photo_url,
                "aspect_ratio": "3:4",
                "output_format": "jpg",
                "output_quality": 95,
                "safety_tolerance": 2,
                "prompt_upsampling": False,  # Disable to preserve original image details
                "guidance_scale": 3.5,  # Lower guidance for more preservation
                "num_inference_steps": 30  # Moderate steps for quality vs preservation balance
            }
        )
        
        if not output:
            raise HTTPException(status_code=500, detail="Failed to generate outfit visualization")
            
        # Replicate returns the image URL directly
        image_url = output if isinstance(output, str) else output[0]
        
        return {
            "success": True,
            "visualization": GeneratedImageResponse(
                image_url=image_url,
                width=768,  # Standard output size for 3:4 aspect ratio
                height=1024
            )
        }
        
    except Exception as e:
        print(f"[Flux] Error generating outfit visualization: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate outfit visualization: {str(e)}"
        )

@app.post("/generate-multiple-outfits")
async def generate_multiple_outfits(
    user_photo_url: str,
    outfits: List[dict],
    style_prompt: str = "high fashion photography",
    background: str = "modern studio"
):
    """
    Generate multiple outfit visualizations from a list of outfit recommendations
    """
    try:
        generated_visualizations = []
        
        for i, outfit in enumerate(outfits):
            # Create outfit description from the outfit data
            outfit_items = outfit.get('items', {})
            top_item = outfit_items.get('top', {})
            bottom_item = outfit_items.get('bottom', {})
            shoes_item = outfit_items.get('shoes', {})
            
            outfit_description = f"""
            {top_item.get('item', 'shirt')} in {top_item.get('color', 'neutral')} color,
            {bottom_item.get('item', 'pants')} in {bottom_item.get('color', 'neutral')} color,
            {shoes_item.get('item', 'shoes')} in {shoes_item.get('color', 'neutral')} color
            """.strip()
            
            # Generate visualization for this outfit
            visualization_request = OutfitVisualizationRequest(
                user_photo_url=user_photo_url,
                outfit_description=outfit_description,
                style_prompt=style_prompt,
                background_setting=background
            )
            
            try:
                result = await generate_outfit_visualization(visualization_request)
                generated_visualizations.append({
                    "outfit_name": outfit.get('name', f'Outfit {i+1}'),
                    "visualization": result['visualization'],
                    "outfit_data": outfit
                })
            except Exception as e:
                print(f"[Flux] Failed to generate visualization for outfit {i+1}: {str(e)}")
                # Continue with other outfits even if one fails
                generated_visualizations.append({
                    "outfit_name": outfit.get('name', f'Outfit {i+1}'),
                    "error": str(e),
                    "outfit_data": outfit
                })
        
        return {
            "success": True,
            "visualizations": generated_visualizations,
            "total_generated": len([v for v in generated_visualizations if 'visualization' in v])
        }
        
    except Exception as e:
        print(f"[Flux] Error in batch outfit generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate outfit visualizations: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)