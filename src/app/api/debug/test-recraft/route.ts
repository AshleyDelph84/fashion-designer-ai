import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });

    console.log(`[Test Recraft] Testing Recraft Crisp Upscale with image: ${imageUrl}`);

    const startTime = Date.now();
    
    const output = await replicate.run(
      "recraft-ai/recraft-crisp-upscale",
      {
        input: {
          image: imageUrl
        }
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[Test Recraft] Upscaling completed in ${duration}ms`);
    console.log(`[Test Recraft] Result: ${output}`);

    return NextResponse.json({
      success: true,
      input: imageUrl,
      output,
      duration_ms: duration,
      model: 'recraft-ai/recraft-crisp-upscale'
    });

  } catch (error) {
    console.error('[Test Recraft] Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}