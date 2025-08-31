import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getInstallationToken } from '@/lib/githubApp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const redirectTo = searchParams.get('redirect_to') || searchParams.get('state') || '/analyzer';

  if (!installationId) {
    return NextResponse.json({ error: 'missing installation_id' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    // Persist installation_id for the current user if logged in
    const session = await auth();
    if (session?.user?.id) {
      await prisma.gitHubInstallation.upsert({
        where: { userId: session.user.id },
        update: { installationId },
        create: { userId: session.user.id, installationId },
      });
    }

    const token = await getInstallationToken(installationId);
    // Attach cookie to the actual redirect response to ensure the browser receives it
    const res = NextResponse.redirect(redirectTo, { status: 302 });
    try {
      res.cookies.set({
        name: 'gh_installation_token',
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });
    } catch {}
    // eslint-disable-next-line no-console
    console.log('[GitHubApp] callback set token cookie and redirecting to', redirectTo);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'token_exchange_failed' }, { status: 500 });
  }
}


