import { NextResponse } from 'next/server';
import { getPlan } from '@/lib/analyzerClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo_url = body?.repo_url || body?.repoUrl;
    if (!repo_url) return NextResponse.json({ error: 'repo_url required' }, { status: 400 });
    const data = await getPlan({ repo_url });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'plan_failed' }, { status: 500 });
  }
}


