import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateFashionRecommendations } from "@/inngest/functions";

// Export HTTP handlers for Inngest API (including PUT for syncing)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateFashionRecommendations,
  ],
}); 
