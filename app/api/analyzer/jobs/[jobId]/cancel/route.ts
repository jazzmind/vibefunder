import { NextResponse } from 'next/server';
import { cancelJob } from '@/lib/analyzerClient';

export async function POST(_: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  try {
    await cancelJob(jobId);
    return NextResponse.json({ status: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'cancel_failed' }, { status: 500 });
  }
}


