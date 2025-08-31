import { NextResponse } from 'next/server';
import { getSow } from '@/lib/analyzerClient';

export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;
  try {
    const data = await getSow(jobId);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sow_failed' }, { status: 500 });
  }
}


