const ANALYZER_BASE_URL = process.env.ANALYZER_BASE_URL || 'http://localhost:8080';
const ANALYZER_CLIENT_ID = process.env.ANALYZER_CLIENT_ID || '';
const ANALYZER_CLIENT_SECRET = process.env.ANALYZER_CLIENT_SECRET || '';

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${ANALYZER_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ANALYZER_CLIENT_ID,
      client_secret: ANALYZER_CLIENT_SECRET,
      scope: 'analyze:write',
    }),
    // Analyzer is external; no cookies
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Analyzer token failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

export async function startAnalysis(payload: any): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Analyzer start failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Analyzer job failed: ${res.status}`);
  return res.json();
}

export async function getSow(jobId: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/sow`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Analyzer sow failed: ${res.status}`);
  return res.json();
}


