import { NextResponse } from 'next/server';
import { getJob } from '@/lib/analyzerClient';

export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;
  try {
    const data = await getJob(jobId);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'status_failed' }, { status: 500 });
  }
}


