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
  const cookieToken = cookieStore.get('gh_installation_token')?.value || '';
  let ghToken = cookieToken || body?.github_token || body?.githubToken || '';
  let mintedGitHubToken: string | undefined;
  // eslint-disable-next-line no-console
  console.log('[AnalyzerStart] cookie token present:', cookieToken ? true : false);
  if (!ghToken) {
    // Try to mint a fresh installation token from persisted installation_id
    const session = await auth();
    // eslint-disable-next-line no-console
    console.log('[AnalyzerStart] user session present:', !!session?.user?.id);
    if (session?.user?.id) {
      const inst = await prisma.gitHubInstallation.findUnique({ where: { userId: session.user.id } });
      // eslint-disable-next-line no-console
      console.log('[AnalyzerStart] installationId found:', !!inst?.installationId);
      if (inst?.installationId) {
        try {
          ghToken = await getInstallationToken(inst.installationId);
          mintedGitHubToken = ghToken;
          // eslint-disable-next-line no-console
          console.log('[AnalyzerStart] minted installation token');
        } catch (err: any) {
          // eslint-disable-next-line no-console
          console.warn('[AnalyzerStart] failed to mint installation token:', err?.message || err);
        }
      }
    }
  }
  if (!ghToken) {
    // Final fallback: env-provided token for server-side analysis (do not set cookie)
    const fallback = process.env.ANALYZER_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
    if (fallback) {
      ghToken = fallback;
      console.warn('[AnalyzerStart] using fallback env GitHub token');
    }
  }

  try {
    const payload = {
      repo_url: repoUrl,
      github_token: ghToken || undefined,
      branch: branch || undefined,
      scanners: scanners || undefined,
    };
    // eslint-disable-next-line no-console
    console.log('[AnalyzerStart] github_token present:', !!ghToken);
    if (!ghToken) console.warn('analyzer:start missing github_token; proceeding for public repo');
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


