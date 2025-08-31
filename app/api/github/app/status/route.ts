import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('gh_installation_token')?.value;
    const session = await auth();
    let installed = false;
    if (session?.user?.id) {
      const inst = await prisma.gitHubInstallation.findUnique({ where: { userId: session.user.id } });
      installed = !!inst;
    }
    return NextResponse.json({ connected: token ? true : installed, installed });
  } catch (e) {
    return NextResponse.json({ connected: false, installed: false }, { status: 200 });
  }
}


