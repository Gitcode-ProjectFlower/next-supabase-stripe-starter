import { serve } from 'inngest/next';
import { NextRequest } from 'next/server';

import { inngest } from '@/libs/inngest/client';
import { cleanupExpiredData } from '@/libs/inngest/functions/cleanup-expired';
import { exportLookalikesJob } from '@/libs/inngest/functions/export-lookalikes';
import { processQAJob } from '@/libs/inngest/functions/process-qa';

// Inngest serve configuration
const inngestHandler = serve({
  client: inngest,
  functions: [processQAJob, exportLookalikesJob, cleanupExpiredData],
  // Explicitly set signingKey for production
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

// Wrap handlers with logging for debugging
export async function GET(request: NextRequest, context: { params?: Promise<any> }) {
  console.log('[Inngest API] GET request received:', {
    url: request.url,
    hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    hasEventKey: !!process.env.INNGEST_EVENT_KEY,
  });
  return inngestHandler.GET(request, context);
}

export async function POST(request: NextRequest, context: { params?: Promise<any> }) {
  console.log('[Inngest API] POST request received:', {
    url: request.url,
    hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    hasEventKey: !!process.env.INNGEST_EVENT_KEY,
  });
  return inngestHandler.POST(request, context);
}

export async function PUT(request: NextRequest, context: { params?: Promise<any> }) {
  console.log('[Inngest API] PUT request received:', {
    url: request.url,
    hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    hasEventKey: !!process.env.INNGEST_EVENT_KEY,
  });
  return inngestHandler.PUT(request, context);
}
