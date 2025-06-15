# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Fashion Guru MVP built on the serverless-agents architecture template. It provides personalized fashion styling advice through AI-powered photo analysis and outfit recommendations. The project transforms users' uploaded photos into styled outfit visualizations using a 2-agent system.

## Development Commands

### Local Development Setup
```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Create environment file from example
cp .env.local.example .env.local
# Then edit .env.local with real API keys

# Start development (requires 3 terminals)
# Terminal 1: Python agents
uvicorn api.agents:app --reload --reload-dir api --port 8000

# Terminal 2: Next.js frontend  
npm run dev

# Terminal 3: Inngest workflow engine
npx inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest
```

### Build and Quality Checks
```bash
# Build for production
npm run build

# Lint code
npm run lint

# Check application health
curl http://localhost:8000/ping  # Python API health
curl http://localhost:3000/api/inngest  # Inngest webhook
```

### Access Points During Development
- **Main App**: http://localhost:3000
- **Python API**: http://localhost:8000
- **Inngest Dashboard**: http://localhost:8288

## Architecture

### Core Stack
- **Frontend**: Next.js 15 with App Router, Tailwind CSS
- **Authentication**: Clerk with social logins, protected routes via middleware
- **AI Agents**: Python FastAPI deployed as Vercel Functions
- **Workflow Orchestration**: Inngest for long-running AI tasks
- **Storage**: Vercel Blob for images and generated content
- **Deployment**: Vercel serverless functions

### Two-Agent System Design
1. **Fashion Analysis Agent** (Gemini 2.5 Flash): Photo analysis, style assessment, outfit recommendations
2. **Outfit Visualization Agent** (Flux-kontext): Generate images of user wearing recommended outfits

### Critical Configuration Files

**vercel.json**: Essential for Python API routing
```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/next" },
    { "src": "api/agents.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "^/api/agents/(.*)", "dest": "/api/agents.py" },
    { "src": "^/api/agents$", "dest": "/api/agents.py" }
  ]
}
```

**middleware.ts**: Clerk authentication protection
- Protected routes: `/dashboard/*`, `/onboarding/*`
- Automatically redirects unauthenticated users

### Data Flow Architecture
1. **Landing Page** (`/`) → Sign-up → **Onboarding** (`/onboarding`) → **Dashboard** (`/dashboard`)
2. **User uploads photo** → **Inngest workflow** → **Python agents** → **AI processing** → **Results display**
3. **User preferences** stored in Clerk `unsafeMetadata` (not `publicMetadata`)

## Key Implementation Details

### Authentication Flow
- Uses Clerk with `unsafeMetadata` for user preferences (not `publicMetadata`)
- Onboarding completion flag: `user.unsafeMetadata.onboardingCompleted`
- Style preferences stored as: `user.unsafeMetadata.stylePreferences`

### Custom UI Components
- **StyleCard** (`/src/components/ui/style-card.tsx`): Interactive preference selection
- **ProgressSteps** (`/src/components/ui/progress-steps.tsx`): Multi-step onboarding progress  
- **ColorPicker** (`/src/components/ui/color-picker.tsx`): Fashion color palette selection

### Python Agents Structure
Located in `api/agents.py`:
- FastAPI app with `/ping` health check
- Agent definitions using Agent class with model, instructions, tools
- Endpoints: `/research`, `/format` (currently newsletter-focused, needs fashion transformation)

### Inngest Workflows
Located in `src/inngest/functions.ts`:
- Multi-step workflow orchestration with error handling and retries
- Example: `generateNewsletter` function (needs transformation to fashion workflow)
- Handles long-running AI tasks that exceed typical serverless timeouts

## Environment Variables Required

### Development
```bash
# Clerk Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# AI Processing
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_api_token

# Storage
NEWSLETTER_READ_WRITE_TOKEN=your_vercel_blob_token

# Optional
APP_URL=http://localhost:3000
INNGEST_SIGNING_KEY=auto_generated_by_inngest
```

### Production (Vercel)
Same variables plus auto-added by Inngest integration:
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

## Current State vs MVP Goals

### ✅ Completed
- Landing page with fashion-focused messaging
- Clerk authentication with social logins
- Multi-step onboarding flow (style preferences, body type, occasions, colors, budget)
- Protected dashboard with outfit creation interface
- Custom UI components for fashion preferences
- Project structure and routing

### ✅ Recently Completed
- Transformed Python agents from newsletter to fashion analysis
- Integrated Google Gemini 2.5 Flash for multimodal photo analysis  
- Implemented complete photo upload and processing workflow
- Created outfit recommendation pipeline with Inngest orchestration
- Built comprehensive fashion UI components and user flows
- Added Flux-kontext integration for outfit visualization generation
- Implemented complete end-to-end fashion analysis with AI-generated outfit images

### 🚧 Needs Implementation (Next Phase)
- Add user history and favorites functionality
- Integrate shopping links and price data
- Add feedback system for recommendation improvement
- Implement batch processing for multiple outfit visualizations
- Add outfit comparison and rating features

### 🎯 Current User Flow (Implemented)
1. **Landing Page** → Sign-up → **Onboarding** (style preferences) → **Dashboard**
2. **Create Outfit**: Upload photo → Select occasion → AI analysis with Gemini 2.5 Flash
3. **AI Processing**: Photo analysis → Outfit recommendations → Flux-kontext visualization generation
4. **Results**: View body analysis, color analysis, 3 outfit recommendations with AI-generated images
5. **Dashboard**: Access history, create new outfits, update preferences

### 🔧 New Architecture Components

**Gemini Integration**: `api/gemini_agents.py` 
- Uses Google Gemini 2.5 Flash for multimodal photo analysis
- Separate endpoints: `/api/gemini/analyze-photo` and `/api/gemini/recommend-outfit`
- Deployed alongside existing OpenAI agents for flexibility

**Flux-kontext Integration**: `api/flux_agents.py`
- Uses Replicate API with FLUX.1 Kontext for outfit visualization generation
- Endpoints: `/api/flux/generate-outfit-visualization` and `/api/flux/generate-multiple-outfits`
- Transforms user photos to show them wearing recommended outfits
- Integrated into Inngest workflow for seamless image generation

**Fashion Workflow**: `src/inngest/functions.ts`
- Event: `fashion/analysis.requested` triggers `generateFashionRecommendations`
- 4-step process: Photo analysis → Outfit recommendations → Visualization generation → Save results
- Uses Gemini agents for analysis and Flux-kontext for outfit visualization
- Complete end-to-end AI pipeline from photo upload to styled outfit images

**Photo Upload System**: 
- `PhotoUpload` component with drag-and-drop support
- API endpoint `/api/fashion/analyze` handles file upload and workflow trigger
- Results stored in blob storage with session-based retrieval

## Development Notes

### Clerk Integration Specifics
- Use `user.unsafeMetadata` for storing user preferences (not `publicMetadata`)
- Onboarding redirects users until `onboardingCompleted: true`
- Sign-up redirects to `/onboarding`, sign-in redirects to `/dashboard`

### Build Considerations
- Build may fail without real Clerk API keys (expected behavior)
- ESLint enforces apostrophe escaping in JSX (`&apos;`)
- Python agent health check available at `/api/agents/ping`

### Development Status Summary

✅ **Core MVP Complete**: Full fashion analysis pipeline with AI-generated outfit visualizations
- Photo upload and analysis with Gemini 2.5 Flash
- Outfit recommendations based on user preferences
- AI-generated images showing user in recommended outfits
- Complete user flow from onboarding to results

🎯 **Next Enhancement Priorities**:
1. User history and favorites system
2. Shopping integration with price data
3. Feedback and rating system for recommendations
4. Advanced styling options and filters