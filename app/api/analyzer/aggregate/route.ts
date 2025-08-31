import { NextResponse } from 'next/server';
import { getAggregate } from '@/lib/analyzerClient';

// For now we proxy to analyzer /aggregate by sending repo_url and optional website via semgrep_config_path
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo_url = body?.repo_url || body?.repoUrl;
    const website_url: string | undefined = body?.website_url || body?.websiteUrl;
    if (!repo_url) return NextResponse.json({ error: 'repo_url required' }, { status: 400 });
    const data = await getAggregate({ repo_url, website_url });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'aggregate_failed' }, { status: 500 });
  }
}


