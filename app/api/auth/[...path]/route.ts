import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

const handler = auth.handler();

// Wraps the auth handler so Neon cold-start timeouts return null session
// instead of hanging the request indefinitely (causes 502 on client).
async function safeHandle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.message?.includes('timeout') || error?.message?.includes('aborted');
    if (isTimeout) {
      return NextResponse.json(null, { status: 200 });
    }
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}

export async function GET(req: Request, ctx: any) {
  return safeHandle(() => handler.GET(req, ctx));
}

export async function POST(req: Request, ctx: any) {
  return safeHandle(() => handler.POST(req, ctx));
}