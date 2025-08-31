import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startAnalysis } from '@/lib/analyzerClient';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getInstallationToken } from '@/lib/githubApp';

export async function POST(request: Request) {
  const body = await request.json();
  const repoUrl: string | undefined = body?.repo_url || body?.repoUrl;
  const branch: string | undefined = body?.branch;
  const scanners: string[] | undefined = body?.scanners;

  if (!repoUrl) return NextResponse.json({ error: 'repo_url required' }, { status: 400 });

  const cookieStore = await cookies();
  let ghToken = cookieStore.get('gh_installation_token')?.value || body?.github_token || body?.githubToken || '';
  let mintedGitHubToken: string | undefined;
  if (!ghToken) {
    // Try to mint a fresh installation token from persisted installation_id
    const session = await auth();
    if (session?.user?.id) {
      const inst = await prisma.gitHubInstallation.findUnique({ where: { userId: session.user.id } });
      if (inst?.installationId) {
        try {
          ghToken = await getInstallationToken(inst.installationId);
          mintedGitHubToken = ghToken;
        } catch {}
      }
    }
  }

  try {
    const payload = {
      repo_url: repoUrl,
      github_token: ghToken || undefined,
      branch: branch || undefined,
      scanners: scanners || undefined,
    };
    if (!ghToken) {
      console.warn('analyzer:start missing github_token; proceeding for public repo');
    }
    const data = await startAnalysis(payload);
    const res = NextResponse.json(data);
    if (mintedGitHubToken) {
      try {
        res.cookies.set({ name: 'gh_installation_token', value: mintedGitHubToken, httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
      } catch {}
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'start_failed' }, { status: 500 });
  }
}


