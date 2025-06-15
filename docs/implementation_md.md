# Implementation Roadmap

## Development Phases

### Phase 1: Core MVP (Weeks 1-3)
**Goal**: Basic working fashion guru with photo analysis and outfit generation

#### Week 1: Template Setup & Agent Replacement
- [ ] Clone serverless-agents template
- [ ] Set up development environment (Node.js, Python, Inngest)
- [ ] Replace OpenAI dependencies with Gemini 2.5 Flash
- [ ] Create `api/fashion_agents.py` replacing newsletter agents
- [ ] Test basic Gemini integration with sample photos
- [ ] Update environment variables for Gemini API

#### Week 2: Frontend & Image Handling
- [ ] Modify Next.js frontend for fashion use case
- [ ] Implement photo upload component
- [ ] Create outfit recommendation display UI
- [ ] Add image preview and crop functionality
- [ ] Set up Vercel Blob storage for user photos
- [ ] Create basic loading states and progress indicators

#### Week 3: Flux Integration & Workflow
- [ ] Integrate Flux-kontext API (via Replicate/HF)
- [ ] Update Inngest workflows for fashion pipeline
- [ ] Connect frontend to backend agents
- [ ] Test complete photo → recommendation → generated image flow
- [ ] Basic error handling and retry logic

### Phase 2: User Management & Auth (Weeks 4-5)
**Goal**: Add user accounts, preferences, and basic billing

#### Week 4: Clerk Integration
- [ ] Install and configure Clerk authentication
- [ ] Add login/signup flows to frontend
- [ ] Create user preference collection forms
- [ ] Implement user metadata storage in Clerk
- [ ] Add protected routes and user sessions

#### Week 5: Billing & Usage Tracking
- [ ] Set up Clerk Billing integration
- [ ] Implement usage tracking (outfit generations)
- [ ] Create subscription plans and payment flows
- [ ] Add usage limits and premium features
- [ ] Dashboard for user to manage subscription

### Phase 3: Polish & Deploy (Week 6)
**Goal**: Production deployment and optimization

- [ ] Performance optimization and testing
- [ ] Error handling and edge cases
- [ ] User experience improvements
- [ ] Deploy to Vercel production
- [ ] Set up monitoring and analytics

## Technical Implementation Details

### API Endpoints

#### Fashion Analysis & Recommendation
```python
# api/fashion_agents.py

@app.post("/fashion-analysis")
async def analyze_and_recommend(request: FashionAnalysisRequest):
    """
    Single endpoint that handles photo analysis and outfit recommendations
    Input: photo_url, user_prompt, user_preferences
    Output: analysis, recommendations, image_generation_prompt
    """

@app.post("/generate-outfit-image") 
async def generate_outfit_image(request: OutfitVisualizationRequest):
    """
    Calls Flux-kontext to generate outfit visualization
    Input: outfit_description, reference_photo_url, style_parameters
    Output: generated_image_url
    """

@app.get("/ping")
async def health_check():
    """Health check endpoint"""
```

#### User Management
```typescript
// src/app/api/user/preferences/route.ts
export async function GET(request: Request) {
  // Fetch user style preferences from Clerk metadata
}

export async function POST(request: Request) {
  // Update user style preferences in Clerk metadata
}

// src/app/api/user/usage/route.ts
export async function GET(request: Request) {
  // Get user's current usage stats (outfit generations this month)
}
```

### Data Models

#### User Preferences Schema
```typescript
interface UserStylePreferences {
  bodyType: 'apple' | 'pear' | 'hourglass' | 'rectangle' | 'inverted-triangle';
  skinTone: 'warm' | 'cool' | 'neutral';
  stylePersonality: string[]; // ['minimalist', 'bohemian', 'classic', 'edgy']
  budgetRange: 'under-50' | '50-150' | '150-300' | 'above-300';
  brands: string[];
  colors: string[];
  occasions: string[];
  fitPreferences: {
    tops: 'fitted' | 'relaxed' | 'oversized';
    bottoms: 'skinny' | 'straight' | 'wide';
    dresses: 'bodycon' | 'a-line' | 'flowing';
  };
}
```

#### Request/Response Models
```python
# api/models.py
from pydantic import BaseModel
from typing import List, Optional

class FashionAnalysisRequest(BaseModel):
    photo_url: str
    user_prompt: str
    occasion: str
    user_preferences: Optional[dict] = None
    
class OutfitRecommendation(BaseModel):
    category: str  # 'top', 'bottom', 'shoes', 'accessories'
    item: str
    color: str
    style: str
    reasoning: str
    price_range: str
    brands: List[str]

class FashionAnalysisResponse(BaseModel):
    body_analysis: dict
    skin_tone_analysis: dict
    style_assessment: dict
    recommendations: List[OutfitRecommendation]
    styling_tips: List[str]
    image_generation_prompt: str
```

### Inngest Workflow

```typescript
// src/inngest/functions.ts

export const generateFashionRecommendation = inngest.createFunction(
  { id: "generate-fashion-recommendation" },
  { event: "fashion/analyze" },
  async ({ event, step }) => {
    // Step 1: Analyze photo and generate recommendations
    const analysis = await step.run("fashion-analysis", async () => {
      return await fetch(`${process.env.PYTHON_API_URL}/fashion-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: event.data.photoUrl,
          user_prompt: event.data.userPrompt,
          occasion: event.data.occasion,
          user_preferences: event.data.userPreferences
        })
      });
    });

    // Step 2: Generate outfit visualization
    const outfitImage = await step.run("generate-outfit-image", async () => {
      return await fetch(`${process.env.PYTHON_API_URL}/generate-outfit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outfit_description: analysis.image_generation_prompt,
          reference_photo: event.data.photoUrl,
          style_parameters: analysis.style_parameters
        })
      });
    });

    // Step 3: Save results and notify user
    await step.run("save-results", async () => {
      return await fetch(`${process.env.NEXTJS_URL}/api/results/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: event.data.userId,
          sessionId: event.data.sessionId,
          analysis: analysis,
          generatedImage: outfitImage.image_url,
          timestamp: new Date().toISOString()
        })
      });
    });

    return {
      analysis,
      outfitImage: outfitImage.image_url,
      sessionId: event.data.sessionId
    };
  }
);
```

### Environment Variables

```bash
# .env.local

# Existing template variables
OPENAI_API_KEY=your_openai_key_here  # Keep for fallback
NEWSLETTER_READ_WRITE_TOKEN=your_vercel_blob_token
INNGEST_SIGNING_KEY=your_inngest_signing_key

# New fashion guru variables
GEMINI_API_KEY=your_gemini_api_key_here
FLUX_API_KEY=your_flux_api_key_here  # Or REPLICATE_API_TOKEN
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# API URLs for Inngest workflows
PYTHON_API_URL=http://localhost:8000  # Development
NEXTJS_URL=http://localhost:3000      # Development

# Production URLs will be auto-set by Vercel
```

### Frontend Components

#### Key UI Components
```typescript
// src/components/PhotoUpload.tsx - Drag & drop photo upload
// src/components/StylePreferences.tsx - User preference forms  
// src/components/OutfitRecommendation.tsx - Display AI recommendations
// src/components/GeneratedOutfit.tsx - Show generated outfit images
// src/components/LoadingStates.tsx - Progress indicators for AI processing
// src/components/SubscriptionManager.tsx - Clerk billing integration
```

#### Page Structure
```
src/app/
├── page.tsx                    # Landing page
├── dashboard/
│   ├── page.tsx               # User dashboard
│   ├── upload/page.tsx        # Photo upload flow
│   ├── results/[id]/page.tsx  # Recommendation results
│   └── preferences/page.tsx   # User style preferences
├── api/
│   ├── inngest/route.ts       # Inngest webhook
│   ├── user/
│   │   ├── preferences/route.ts
│   │   └── usage/route.ts
│   └── results/
│       └── save/route.ts
└── sign-in/page.tsx           # Clerk auth pages
```

### Database Schema (Clerk Metadata)

```typescript
// User metadata stored in Clerk
interface ClerkUserMetadata {
  publicMetadata: {
    stylePreferences: UserStylePreferences;
    subscriptionTier: 'free' | 'basic' | 'premium';
    usageStats: {
      monthlyGenerations: number;
      totalGenerations: number;
      lastResetDate: string;
    };
  };
  privateMetadata: {
    generationHistory: Array<{
      id: string;
      timestamp: string;
      occasion: string;
      satisfaction_rating?: number;
    }>;
  };
}
```

## Testing Strategy

### Unit Tests
- [ ] Python agent functions
- [ ] TypeScript utility functions
- [ ] API endpoint responses

### Integration Tests  
- [ ] Complete photo → recommendation → image flow
- [ ] Clerk authentication flow
- [ ] Billing and usage tracking
- [ ] Inngest workflow execution

### User Testing
- [ ] Photo upload UX across devices
- [ ] Recommendation quality assessment
- [ ] Performance on mobile devices
- [ ] Payment flow testing

## Performance Considerations

### Optimization Targets
- **Photo Analysis**: < 10 seconds
- **Image Generation**: < 30 seconds  
- **Total Workflow**: < 45 seconds
- **Frontend Load**: < 2 seconds

### Scaling Strategies
- **Image Processing**: Resize/compress uploads before API calls
- **Caching**: Cache user preferences and common recommendations
- **Queue Management**: Inngest handles load balancing automatically
- **CDN**: Vercel Edge for global performance

## Security & Privacy

### Data Protection
- [ ] Auto-delete uploaded photos after 24 hours
- [ ] Encrypt sensitive user data
- [ ] GDPR-compliant data handling
- [ ] Rate limiting on API endpoints

### Authentication Security
- [ ] Clerk handles OAuth security
- [ ] JWT token validation
- [ ] API key rotation strategy
- [ ] Audit logging for sensitive operations