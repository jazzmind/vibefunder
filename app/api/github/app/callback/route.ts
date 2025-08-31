import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getInstallationToken } from '@/lib/githubApp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const redirectTo = searchParams.get('redirect_to') || '/analyzer';

  if (!installationId) {
    return NextResponse.json({ error: 'missing installation_id' }, { status: 400 });
  }

  try {
    const token = await getInstallationToken(installationId);
    cookies().set({
      name: 'gh_installation_token',
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });
    return NextResponse.redirect(redirectTo, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'token_exchange_failed' }, { status: 500 });
  }
}


