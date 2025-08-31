import jwt from 'jsonwebtoken';

const GH_APP_ID = process.env.GH_APP_ID || '';
const GH_APP_PRIVATE_KEY = (process.env.GH_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GH_APP_INSTALL_URL = process.env.GH_APP_INSTALL_URL || '';

if (!GH_APP_ID) console.warn('GH_APP_ID not set');
if (!GH_APP_PRIVATE_KEY) console.warn('GH_APP_PRIVATE_KEY not set');
if (!GH_APP_INSTALL_URL) console.warn('GH_APP_INSTALL_URL not set');

export function getInstallUrl(state?: string): string {
  const u = new URL(GH_APP_INSTALL_URL);
  if (state) u.searchParams.set('state', state);
  return u.toString();
}

export function signAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: GH_APP_ID,
  };
  return jwt.sign(payload, GH_APP_PRIVATE_KEY, { algorithm: 'RS256' });
}

export async function getInstallationToken(installationId: string): Promise<string> {
  const appJwt = signAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${appJwt}`,
      'accept': 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub access_tokens failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.token as string;
}


