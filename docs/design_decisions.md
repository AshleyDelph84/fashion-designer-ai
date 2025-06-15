# Design Decisions & Technical Rationale

## Architecture Decisions

### Why Serverless-Agents Template?
**Decision**: Use the serverless-agents template as the foundation
**Reasoning**: 
- **Proven Architecture**: Already handles the complex orchestration of AI agents + serverless functions
- **Cost Efficiency**: Serverless scales to zero when not in use - perfect for early-stage product
- **Long-Running Tasks**: Inngest solves the fundamental problem of image generation taking 30+ seconds
- **Developer Experience**: Excellent local development setup with hot reloading
- **Time to Market**: Avoids months of infrastructure setup

**Alternatives Considered**:
- **Custom Next.js + API Routes**: Would require custom workflow orchestration, more complex
- **Full Backend (Express/FastAPI)**: Higher costs, always-running servers, scaling complexity
- **Microservices**: Over-engineered for MVP, adds deployment complexity

### Why 2 Agents Instead of 3?
**Decision**: Combine photo analysis + outfit recommendation into single Gemini agent
**Reasoning**:
- **Context Preservation**: Gemini can see the photo while making recommendations, leading to better coherence
- **Cost Efficiency**: One API call instead of two reduces costs by ~50%
- **Speed**: Single request reduces total processing time
- **Simplicity**: Fewer moving parts, less error-prone workflow

**Trade-offs**:
- **Less Modularity**: Can't easily swap out analysis vs. recommendation models
- **Longer Prompts**: Single agent needs more complex instructions
- **Debugging**: Harder to isolate failures to specific functionality

### Why Gemini 2.5 Flash Over GPT-4?
**Decision**: Use Gemini 2.5 Flash Preview for all text-based AI tasks
**Reasoning**:
- **Cost**: ~10x cheaper than GPT-4 Vision - critical for photo analysis at scale
- **Multimodal**: Native image understanding without preprocessing
- **Speed**: "Flash" designation means faster responses than standard Gemini
- **Quality**: Sufficient for fashion analysis and recommendations

**Performance Comparison**:
```
GPT-4o: $15/1M tokens, excellent quality, slower
Gemini 2.5 Flash: $1.5/1M tokens, good quality, faster
Claude Sonnet: $15/1M tokens, excellent quality, no vision API
```

**Risk Mitigation**: Keep code flexible to switch models if quality issues arise

## Tech Stack Decisions

### Why Clerk Over NextAuth?
**Decision**: Use Clerk for authentication and billing
**Reasoning**:
- **Billing Integration**: New Clerk Billing eliminates need for separate Stripe integration
- **User Management**: Built-in user profiles, metadata storage, admin dashboard
- **Social Logins**: Easy Google/Apple integration - expected by fashion app users
- **Mobile Ready**: Excellent mobile SDKs for future app development

**Alternatives Considered**:
- **NextAuth + Stripe**: More setup, need to build user management system
- **Supabase Auth**: Good option but adds another service dependency
- **Custom Auth**: Too much development time for MVP

### Why Vercel Blob Over AWS S3?
**Decision**: Use Vercel Blob for image storage
**Reasoning**:
- **Integration**: Seamless with Vercel deployment, zero configuration
- **Performance**: Edge-optimized for global delivery
- **Simplicity**: No separate AWS account or complex IAM setup
- **Cost**: Competitive pricing for MVP scale

**Trade-offs**:
- **Vendor Lock-in**: Harder to migrate than S3
- **Advanced Features**: Less sophisticated than AWS ecosystem
- **Scale Limits**: May need to migrate at very high scale

### Why Flux-kontext Over DALL-E 3?
**Decision**: Use Flux-kontext for outfit image generation
**Reasoning**:
- **Fashion Focus**: Flux-kontext excels at photorealistic people and clothing
- **Quality**: Better outfit visualization than DALL-E for fashion use cases
- **Cost**: More cost-effective than OpenAI image generation
- **Control**: More parameters for style and fit customization

**Implementation Options**:
- **Replicate**: Easy API, pay-per-use pricing
- **Hugging Face**: More configuration, potentially cheaper at scale
- **Local Hosting**: Too complex for MVP

## Data Architecture Decisions

### Why Clerk Metadata Over Separate Database?
**Decision**: Store user preferences in Clerk's user metadata
**Reasoning**:
- **Simplicity**: No separate database to setup, manage, or deploy
- **GDPR Compliance**: Clerk handles data protection requirements
- **Performance**: Co-located with auth data, fast user lookups
- **Cost**: No additional database hosting costs

**Limitations**:
- **Query Complexity**: Can't do complex analytics or relationships
- **Size Limits**: Metadata has size constraints for large data
- **Migration**: Harder to move to different database later

**When to Migrate**: If we need complex user analytics, recommendation history analysis, or social features

### Why Auto-Delete Photos?
**Decision**: Automatically delete uploaded photos after 24-48 hours
**Reasoning**:
- **Privacy**: Users expect photo privacy, especially for body/appearance analysis
- **Storage Costs**: Avoid accumulating storage costs for temporary processing
- **Compliance**: Easier GDPR compliance with minimal data retention
- **Security**: Reduced attack surface with less stored personal data

**Implementation**:
```typescript
// Vercel Blob with TTL
await put('user-photo.jpg', photoBuffer, {
  addRandomSuffix: true,
  access: 'private',
  // Auto-delete after 48 hours
  multipart: true
});
```

## AI/ML Decisions

### Why Multimodal Over Vision + Text Pipeline?
**Decision**: Use Gemini's native multimodal capabilities instead of separate vision analysis
**Reasoning**:
- **Context**: Model can reference visual elements while generating text recommendations
- **Accuracy**: Reduces errors from vision → text → recommendation translation
- **Latency**: Single API call instead of sequential calls
- **Cost**: Eliminates separate vision analysis API costs

### Why Prompt Engineering Over Fine-Tuning?
**Decision**: Use sophisticated prompts instead of fine-tuned models
**Reasoning**:
- **Speed to Market**: No need to collect training data or train models
- **Flexibility**: Easy to iterate and improve prompts
- **Cost**: No training costs or custom model hosting
- **Quality**: Modern models respond well to detailed prompts

**Prompt Strategy**:
```
System: You are a professional fashion stylist with 10+ years experience...

Analysis Framework:
1. Body Shape Assessment: [detailed criteria]
2. Skin Tone Analysis: [seasonal color theory]
3. Current Style Evaluation: [style categories]

Recommendation Rules:
- Always consider body proportions
- Suggest specific brands when possible
- Include styling rationale
- Format for image generation
```

## User Experience Decisions

### Why Real-Time Status Updates?
**Decision**: Show live progress during AI processing
**Reasoning**:
- **Expectation Management**: 45-second processing needs clear communication
- **Engagement**: Keeps users engaged instead of wondering if app crashed
- **Trust**: Transparency builds confidence in AI processing

**Implementation**: WebSocket updates from Inngest workflow steps

### Why Side-by-Side Result Display?
**Decision**: Show original photo next to generated outfit image
**Reasoning**:
- **Comparison**: Users want to see the transformation
- **Trust**: Transparency about what the AI changed
- **Feedback**: Easier for users to rate accuracy of recommendations

### Why Freemium Over Pay-Per-Use?
**Decision**: Freemium model with subscription tiers
**Reasoning**:
- **User Acquisition**: Free tier reduces barrier to entry
- **Predictable Revenue**: Subscriptions provide stable cash flow
- **User Behavior**: Fashion advice is often needed repeatedly (events, seasons, style evolution)

**Pricing Strategy**:
- **Free**: 3 outfit generations per month
- **Basic ($4.99)**: 20 generations + style history
- **Premium ($9.99)**: Unlimited + advanced features

## Performance Decisions

### Why Client-Side Image Compression?
**Decision**: Compress and resize images in the browser before upload
**Reasoning**:
- **API Speed**: Smaller images = faster processing
- **Cost**: Reduced bandwidth and processing costs
- **User Experience**: Faster uploads, especially on mobile

**Implementation**:
```typescript
// Canvas-based compression to 800px max width, 85% quality
const compressImage = (file: File): Promise<Blob> => {
  // Browser-based compression logic
}
```

### Why Progressive Enhancement?
**Decision**: Build core functionality without JavaScript dependencies
**Reasoning**:
- **Accessibility**: Works for users with disabilities or older devices
- **Performance**: Faster initial page loads
- **SEO**: Better search engine visibility
- **Reliability**: Graceful degradation if JavaScript fails

## Security Decisions

### Why API Key Rotation Strategy?
**Decision**: Implement regular rotation of AI API keys
**Reasoning**:
- **Security**: Limits damage if keys are compromised
- **Compliance**: Best practice for handling sensitive credentials
- **Monitoring**: Easier to track usage and detect anomalies

### Why Rate Limiting on API Endpoints?
**Decision**: Implement aggressive rate limiting on fashion analysis endpoints
**Reasoning**:
- **Cost Control**: Prevent runaway AI API costs from abuse
- **Quality**: Encourages thoughtful usage over rapid-fire requests
- **Security**: Prevents DoS attacks on expensive AI endpoints

**Limits**:
```
Free users: 3 requests/day, 1 request/5 minutes
Basic users: 20 requests/month, 5 requests/hour  
Premium users: Unlimited, 10 requests/hour
```

## Future-Proofing Decisions

### Why Modular Agent Architecture?
**Decision**: Keep agents as separate, swappable components
**Reasoning**:
- **Model Evolution**: Easy to switch to better models as they become available
- **A/B Testing**: Can test different models for different user segments
- **Cost Optimization**: Mix expensive and cheap models based on user tier

### Why API-First Design?
**Decision**: Build robust APIs that could power mobile apps or third-party integrations
**Reasoning**:
- **Platform Growth**: Easier to add iOS/Android apps later
- **Business Model**: Could license API to other fashion companies
- **Testing**: Easier to test backend logic independently

### Why Configuration-Driven Prompts?
**Decision**: Store AI prompts in configuration files, not hardcoded
**Reasoning**:
- **Iteration Speed**: Update prompts without code deployments
- **Personalization**: Different prompts for different user segments
- **Optimization**: Easy to A/B test prompt variations

```typescript
// src/config/prompts.ts
export const FASHION_ANALYSIS_PROMPT = {
  base: "You are a professional fashion stylist...",
  bodyAnalysis: "Analyze the following aspects...",
  skinTone: "Determine skin undertones using...",
  recommendations: "Suggest specific items that..."
};
```

## Risk Mitigation Decisions

### Why Multiple AI Provider Support?
**Decision**: Build abstraction layer that supports multiple AI providers
**Reasoning**:
- **Vendor Risk**: Reduces dependency on single AI company
- **Cost Optimization**: Can switch to cheaper providers
- **Capability**: Use best model for each specific task
- **Reliability**: Fallback options if one provider has outages

### Why Comprehensive Error Handling?
**Decision**: Extensive error handling and retry logic for all AI calls
**Reasoning**:
- **User Experience**: AI services can be unreliable, need graceful failures
- **Cost**: Failed requests still cost money, need to minimize waste
- **Data Quality**: Bad AI responses need to be caught and handled

### Why Usage Analytics from Day One?
**Decision**: Implement detailed analytics and monitoring from MVP launch
**Reasoning**:
- **Product Development**: Understand how users actually use the product
- **Cost Management**: Track AI API costs per user and feature
- **Quality Monitoring**: Detect when AI responses decline in quality
- **Business Intelligence**: Understand conversion funnels and user behavior