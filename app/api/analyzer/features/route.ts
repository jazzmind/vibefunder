import { NextResponse } from 'next/server';
import { featureScan } from '@/lib/analyzerClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo_url: string | undefined = body?.repo_url || body?.repoUrl;
    const features = Array.isArray(body?.features) ? body.features : [];
    if (!repo_url || features.length === 0) return NextResponse.json({ error: 'repo_url and features required' }, { status: 400 });
    const data = await featureScan({ repo_url, features, branch: body?.branch, github_token: body?.github_token });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'features_failed' }, { status: 500 });
  }
}


