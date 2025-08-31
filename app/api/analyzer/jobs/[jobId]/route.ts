import { NextResponse } from 'next/server';
import { getJob } from '@/lib/analyzerClient';

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  try {
    const data = await getJob(jobId);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'status_failed' }, { status: 500 });
  }
}


