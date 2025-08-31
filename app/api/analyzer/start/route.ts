import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startAnalysis } from '@/lib/analyzerClient';

export async function POST(request: Request) {
  const body = await request.json();
  const repoUrl: string | undefined = body?.repo_url || body?.repoUrl;
  const branch: string | undefined = body?.branch;
  const scanners: string[] | undefined = body?.scanners;

  if (!repoUrl) return NextResponse.json({ error: 'repo_url required' }, { status: 400 });

  const ghToken = cookies().get('gh_installation_token')?.value || body?.github_token || body?.githubToken || '';

  try {
    const payload = {
      repo_url: repoUrl,
      github_token: ghToken || undefined,
      branch: branch || undefined,
      scanners: scanners || undefined,
    };
    const data = await startAnalysis(payload);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'start_failed' }, { status: 500 });
  }
}


