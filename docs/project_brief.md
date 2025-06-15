# AI Fashion Guru MVP

## Project Overview
Building an AI fashion stylist application that analyzes user-uploaded photos and generates personalized outfit recommendations with visual mockups. The system takes into account the user's body shape, skin tone, style preferences, and specific occasion requirements to provide tailored fashion advice.

## Core Value Proposition
- **Personalized Styling**: AI-powered analysis of individual body characteristics and style preferences
- **Visual Recommendations**: Not just text suggestions, but actual generated images showing the user in recommended outfits
- **Accessible Fashion Advice**: Professional-level styling guidance available to anyone with a smartphone
- **Occasion-Specific**: Tailored recommendations for work, casual, formal, seasonal events, etc.

## Tech Stack
- **Base Template**: serverless-agents (https://github.com/brookr/serverless-agents)
- **Frontend**: Next.js 15 with App Router + Tailwind CSS
- **Authentication**: Clerk (social logins, user management)
- **User Data Storage**: Clerk user metadata + Vercel Blob for images
- **AI Agents**: Python FastAPI + Google Gemini 2.5 Flash (multimodal)
- **Workflow Orchestration**: Inngest (handles long-running AI tasks)
- **Image Generation**: Flux-kontext model via Replicate or Hugging Face
- **Deployment**: Vercel (serverless functions)
- **Billing**: Clerk Billing integration

## Architecture: 2-Agent System

### Agent 1: Fashion Analysis & Recommendation Agent (Gemini 2.5 Flash)
**Purpose**: Complete photo analysis and outfit recommendation in a single call
**Inputs**: 
- User-uploaded photo
- Style preferences/occasion prompt
- Historical user preferences (from Clerk metadata)
**Outputs**:
- Body shape analysis
- Skin tone assessment
- Current style evaluation
- Specific outfit recommendations (items, colors, brands)
- Styling rationale and tips
- Detailed description for image generation

### Agent 2: Outfit Visualization Agent (Flux-kontext)
**Purpose**: Generate realistic images of the user wearing recommended outfits
**Inputs**:
- Detailed outfit description from Agent 1
- Original user photo (for reference)
- Style specifications (fit, colors, accessories)
**Outputs**:
- High-quality generated image showing user in recommended outfit
- Multiple angle/pose variations (optional)

## User Journey

### 1. Onboarding
- User signs up via Clerk (Google/Apple login)
- Brief style quiz to set initial preferences
- Optional body measurements/fit preferences

### 2. Style Request
- Upload photo (full body preferred, but works with partial)
- Describe occasion ("job interview", "date night", "casual weekend")
- Specify any constraints ("budget under $200", "business casual", "no bright colors")

### 3. AI Processing
- Inngest orchestrates the workflow
- Real-time status updates via UI
- Processing time: 30-60 seconds total

### 4. Results Delivery
- Side-by-side view: original photo vs. styled recommendation
- Detailed breakdown of recommendations with reasoning
- Shopping links for suggested items (future monetization)
- Save/share functionality

### 5. Feedback Loop
- User rates recommendations
- Feedback stored in user preferences
- Improves future suggestions

## Key Features

### MVP Features (Phase 1)
- Photo upload and analysis
- Basic outfit recommendations
- Image generation with new outfits
- User authentication
- Simple preference storage

### Enhanced Features (Phase 2)
- Multiple outfit options per request
- Seasonal/weather considerations
- Budget-aware recommendations
- Brand preferences
- Style history and favorites

### Premium Features (Phase 3)
- Personal stylist chat mode
- Wardrobe organization
- Shopping integration
- Style challenges and trends
- Social sharing and community

## Monetization Strategy
- **Freemium Model**: 3 free outfit generations, then subscription
- **Subscription Tiers**: 
  - Basic ($4.99/month): 20 outfit generations
  - Premium ($9.99/month): Unlimited + priority processing + advanced features
- **Pay-per-use**: $1.99 per outfit generation for casual users
- **Future**: Affiliate commissions from shopping recommendations

## Success Metrics
- **Engagement**: Daily/weekly active users, session duration
- **Quality**: User rating of recommendations, return usage
- **Conversion**: Free to paid conversion rate
- **Revenue**: Monthly recurring revenue, average revenue per user

## Target Audience
- **Primary**: Fashion-conscious individuals aged 18-35
- **Secondary**: Busy professionals needing styling help
- **Tertiary**: Special occasion users (weddings, interviews, events)

## Competitive Advantages
- **AI-Powered Personalization**: More sophisticated than basic style apps
- **Visual Results**: Generated images vs. just product recommendations
- **Serverless Scale**: Can handle viral growth without infrastructure issues
- **Cost-Efficient**: AI costs manageable with smart model choices

## Technical Constraints
- **Model Costs**: Gemini 2.5 Flash chosen for cost efficiency vs. GPT-4
- **Processing Time**: Image generation requires user patience, good UX critical
- **Image Quality**: Flux-kontext quality needs to meet user expectations
- **Storage Costs**: User photos and generated images require blob storage

## Privacy & Security
- **Photo Handling**: Auto-delete uploaded photos after processing (configurable retention)
- **User Data**: Minimal personal data storage, leveraging Clerk's privacy compliance
- **Generated Images**: User owns generated outfit images
- **Data Protection**: GDPR compliance through Clerk + Vercel infrastructure