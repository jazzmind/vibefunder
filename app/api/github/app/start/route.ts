import { NextResponse } from 'next/server';
import { getInstallUrl } from '@/lib/githubApp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || searchParams.get('redirect_to') || '';
  // eslint-disable-next-line no-console
  console.log('[GitHubApp] start redirect with state:', state);
  const url = getInstallUrl(state);
  return NextResponse.redirect(url, { status: 302 });
}


