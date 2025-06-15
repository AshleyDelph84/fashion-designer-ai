# References & Documentation

## Core Template & Architecture

### Serverless-Agents Template
- **Repository**: https://github.com/brookr/serverless-agents
- **Live Demo**: https://serverless-agents.vercel.app/
- **Documentation**: Template README provides deployment and setup instructions
- **Key Files to Study**:
  - `api/agents.py` - Python agent structure
  - `src/inngest/functions.ts` - Workflow orchestration
  - `vercel.json` - Critical routing configuration
  - `src/app/api/` - Next.js API route patterns

### Inngest (Workflow Orchestration)
- **Main Site**: https://www.inngest.com/
- **Documentation**: https://www.inngest.com/docs
- **Key Concepts**: 
  - Functions: https://www.inngest.com/docs/functions
  - Steps & Retries: https://www.inngest.com/docs/functions/steps-and-errors
  - Development Server: https://www.inngest.com/docs/local-development
- **SDK Reference**: https://www.inngest.com/docs/sdk/serve

## AI & Machine Learning

### Google Gemini 2.5 Flash
- **API Documentation**: https://ai.google.dev/gemini-api/docs
- **Multimodal Guide**: https://ai.google.dev/gemini-api/docs/vision
- **Python SDK**: https://github.com/google/generative-ai-python
- **Pricing**: https://ai.google.dev/pricing
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/models/gemini#rate-limits

#### Key Gemini Examples
- **Image Analysis**: https://ai.google.dev/gemini-api/docs/vision#analyze-image
- **Multimodal Prompting**: https://ai.google.dev/gemini-api/docs/prompting/multimodal
- **Python Integration**: https://ai.google.dev/gemini-api/docs/get-started/python

### Flux-kontext (Image Generation)
#### Replicate Integration (Recommended)
- **Flux on Replicate**: https://replicate.com/black-forest-labs/flux-1.1-pro
- **API Documentation**: https://replicate.com/docs
- **Python Client**: https://github.com/replicate/replicate-python
- **Pricing**: https://replicate.com/pricing

#### Hugging Face Alternative
- **Flux on HF**: https://huggingface.co/black-forest-labs/FLUX.1-dev
- **Inference API**: https://huggingface.co/docs/api-inference/index
- **Python Library**: https://github.com/huggingface/huggingface_hub

#### Example API Calls
```python
# Replicate
import replicate
output = replicate.run(
    "black-forest-labs/flux-1.1-pro",
    input={"prompt": "professional photo of person wearing..."}
)

# Hugging Face
from huggingface_hub import InferenceClient
client = InferenceClient()
image = client.text_to_image("professional photo of person wearing...")
```

## Authentication & User Management

### Clerk
- **Main Documentation**: https://clerk.com/docs
- **Next.js Integration**: https://clerk.com/docs/quickstarts/nextjs
- **User Metadata**: https://clerk.com/docs/users/metadata
- **Billing Integration**: https://clerk.com/docs/billing/overview
- **React Components**: https://clerk.com/docs/components/overview

#### Key Clerk Guides
- **Authentication Setup**: https://clerk.com/docs/authentication/overview
- **User Management**: https://clerk.com/docs/users/overview
- **Webhooks**: https://clerk.com/docs/integrations/webhooks
- **Backend API**: https://clerk.com/docs/backend-requests/overview

### Clerk Billing
- **Setup Guide**: https://clerk.com/docs/billing/quickstart
- **Subscription Management**: https://clerk.com/docs/billing/subscriptions
- **Usage Tracking**: https://clerk.com/docs/billing/usage-based-billing
- **Pricing Models**: https://clerk.com/docs/billing/pricing-models

## Frontend Development

### Next.js 15
- **Documentation**: https://nextjs.org/docs
- **App Router**: https://nextjs.org/docs/app
- **API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **File Upload**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers#handling-different-http-methods

### UI Components & Styling
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Lucide Icons**: https://lucide.dev/
- **Radix UI**: https://www.radix-ui.com/ (basis for shadcn/ui)

#### Key UI Patterns for Fashion App
- **File Upload**: https://ui.shadcn.com/docs/components/form#file-upload
- **Image Display**: https://ui.shadcn.com/docs/components/avatar
- **Loading States**: https://ui.shadcn.com/docs/components/skeleton
- **Progress Indicators**: https://ui.shadcn.com/docs/components/progress

## Storage & Infrastructure

### Vercel Platform
- **Documentation**: https://vercel.com/docs
- **Deployment**: https://vercel.com/docs/deployments/overview
- **Environment Variables**: https://vercel.com/docs/projects/environment-variables
- **Python Functions**: https://vercel.com/docs/functions/runtimes/python

### Vercel Blob Storage
- **Documentation**: https://vercel.com/docs/storage/vercel-blob
- **API Reference**: https://vercel.com/docs/storage/vercel-blob/api-reference
- **Client SDK**: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
- **Image Optimization**: https://vercel.com/docs/functions/edge-functions/vercel-og

#### Blob Storage Examples
```typescript
import { put, del } from '@vercel/blob';

// Upload with auto-deletion
const blob = await put('user-photo.jpg', file, {
  access: 'private',
  addRandomSuffix: true,
  // Auto-delete after 48 hours
  multipart: true
});

// Manual deletion
await del(blob.url);
```

## Development Tools & Setup

### Python Environment
- **FastAPI**: https://fastapi.tiangolo.com/
- **Pydantic**: https://docs.pydantic.dev/latest/
- **Uvicorn**: https://www.uvicorn.org/
- **Python HTTP Clients**: https://docs.python-requests.org/

### Node.js Environment
- **TypeScript**: https://www.typescriptlang.org/docs/
- **ESLint Config**: https://nextjs.org/docs/app/building-your-application/configuring/eslint
- **Package Management**: https://docs.npmjs.com/

## Testing & Monitoring

### Testing Frameworks
- **Jest**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright**: https://playwright.dev/ (for E2E testing)

### Monitoring & Analytics
- **Vercel Analytics**: https://vercel.com/docs/analytics
- **Vercel Speed Insights**: https://vercel.com/docs/speed-insights
- **PostHog**: https://posthog.com/docs (recommended for user analytics)

## Fashion & AI References

### Fashion Analysis Concepts
- **Body Shape Analysis**: https://www.styleswardrobe.com/body-shapes/
- **Color Theory**: https://www.colormebeautiful.com/color-analysis
- **Style Categories**: https://www.styleseat.com/blog/style-guides/personal-style-types/

### AI Fashion Applications
- **Fashion AI Research**: https://arxiv.org/list/cs.CV/recent (computer vision papers)
- **Style Transfer**: https://github.com/nvlabs/SPADE
- **Fashion Recommendation Systems**: Academic papers on fashion ML

## Legal & Compliance

### Privacy & Data Protection
- **GDPR Compliance**: https://gdpr.eu/what-is-gdpr/
- **Vercel Privacy**: https://vercel.com/legal/privacy-policy
- **Clerk Privacy**: https://clerk.com/legal/privacy-policy

### AI & Content Policies
- **OpenAI Usage Policies**: https://openai.com/policies/usage-policies
- **Google AI Principles**: https://ai.google/principles/
- **Image Rights**: Research fair use for AI-generated images

## Business & Monetization

### SaaS Metrics & KPIs
- **SaaS Metrics Guide**: https://www.klipfolio.com/resources/articles/saas-metrics
- **Conversion Funnels**: https://mixpanel.com/blog/conversion-funnel-analysis/
- **Pricing Strategy**: https://www.priceintelligently.com/

### Fashion Industry Insights
- **Fashion Market Research**: https://www.fashionunited.com/global-fashion-industry-statistics
- **Consumer Behavior**: https://www.mckinsey.com/industries/retail/our-insights

## Quick Start Commands

### Development Setup
```bash
# Clone template
git clone https://github.com/brookr/serverless-agents.git
cd serverless-agents

# Install dependencies
npm install
pip install -r requirements.txt

# Environment setup
cp .env.example .env.local
# Add your API keys

# Start development servers
npm run dev                    # Terminal 1: Next.js
uvicorn api.agents:app --reload --port 8000  # Terminal 2: Python
npx inngest-cli@latest dev     # Terminal 3: Inngest
```

### Key URLs During Development
- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000
- **Inngest Dashboard**: http://localhost:8288
- **API Docs**: http://localhost:8000/docs

## Helpful Community Resources

### Discord/Forums
- **Inngest Community**: https://discord.gg/inngest
- **Clerk Community**: https://discord.gg/clerk
- **Vercel Community**: https://github.com/vercel/vercel/discussions

### GitHub Examples & Templates
- **Similar AI Projects**: Search GitHub for "ai fashion" or "style recommendation"
- **Vercel Examples**: https://github.com/vercel/examples
- **Next.js Examples**: https://github.com/vercel/next.js/tree/canary/examples

### YouTube Tutorials
- **Inngest Tutorials**: Search for "Inngest workflow" tutorials
- **Clerk Integration**: Search for "Clerk Next.js" setup videos
- **AI Fashion Apps**: Look for fashion tech development videos

## Emergency Contacts & Support

### Technical Support
- **Vercel Support**: https://vercel.com/support
- **Clerk Support**: https://clerk.com/support
- **Inngest Support**: https://www.inngest.com/support

### API Status Pages
- **Vercel Status**: https://www.vercelstatus.com/
- **Google AI Status**: https://status.cloud.google.com/
- **Clerk Status**: https://status.clerk.com/

This reference document should be updated as new tools, APIs, or resources are discovered during development.