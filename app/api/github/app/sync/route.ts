import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { signAppJwt } from '@/lib/githubApp';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: session.user.id },
      select: { username: true },
    });

    const username = connection?.username;
    if (!username) {
      return NextResponse.json({ installed: false, message: 'GitHub username unknown. Connect account first.' }, { status: 200 });
    }

    const appJwt = await signAppJwt();
    let installationId: string | null = null;
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`https://api.github.com/app/installations?per_page=100&page=${page}` , {
        headers: {
          authorization: `Bearer ${appJwt}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
        },
      });
      if (!res.ok) break;
      const installs = await res.json();
      if (!Array.isArray(installs) || installs.length === 0) break;
      const match = installs.find((i: any) => (i?.account?.login || '').toLowerCase() === username.toLowerCase());
      if (match?.id) {
        installationId = String(match.id);
        break;
      }
    }

    if (!installationId) {
      return NextResponse.json({ installed: false }, { status: 200 });
    }

    await prisma.gitHubInstallation.upsert({
      where: { userId: session.user.id },
      update: { installationId },
      create: { userId: session.user.id, installationId },
    });

    return NextResponse.json({ installed: true, installationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sync_failed' }, { status: 500 });
  }
}


