import { NextResponse } from 'next/server';
import { getCapabilities } from '@/lib/analyzerClient';

export async function GET() {
  try {
    const data = await getCapabilities();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'capabilities_failed' }, { status: 500 });
  }
}


