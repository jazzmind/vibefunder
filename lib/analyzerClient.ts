const ANALYZER_BASE_URL = process.env.ANALYZER_BASE_URL || 'http://localhost:8080';
const ANALYZER_CLIENT_ID = process.env.ANALYZER_CLIENT_ID || '';
const ANALYZER_CLIENT_SECRET = process.env.ANALYZER_CLIENT_SECRET || '';
const ANALYZER_DEBUG = process.env.ANALYZER_DEBUG === '1' || process.env.NODE_ENV !== 'production';

let CACHED_TOKEN: string | null = null;
let TOKEN_EXPIRES_AT_MS = 0;

// Function to clear cached token for debugging
export function clearCachedToken() {
  console.log('[AnalyzerClient] Clearing cached token');
  CACHED_TOKEN = null;
  TOKEN_EXPIRES_AT_MS = 0;
}

function debug(...args: any[]) {
  if (ANALYZER_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[AnalyzerClient]', ...args);
  }
}

function maskValue(value: string): string {
  if (!value) return '(empty)';
  const show = 4;
  return value.length > show * 2 ? `${value.slice(0, show)}…${value.slice(-show)}` : '***';
}

async function getAccessToken(): Promise<string> {
  if (!ANALYZER_CLIENT_ID || !ANALYZER_CLIENT_SECRET) {
    throw new Error('Analyzer client credentials missing: set ANALYZER_CLIENT_ID and ANALYZER_CLIENT_SECRET');
  }
  if (CACHED_TOKEN && Date.now() < TOKEN_EXPIRES_AT_MS) {
    debug('getAccessToken: using cached token, expires in', Math.round((TOKEN_EXPIRES_AT_MS - Date.now()) / 1000), 'seconds');
    return CACHED_TOKEN;
  }
  debug('getAccessToken: POST', `${ANALYZER_BASE_URL}/oauth/token`, 'client_id:', maskValue(ANALYZER_CLIENT_ID));
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
  debug('getAccessToken: response', res.status);
  if (!res.ok) {
    const t = await res.text();
    debug('getAccessToken: error body', t);
    throw new Error(`Analyzer token failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  debug('getAccessToken: token obtained');
  const ttl = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  CACHED_TOKEN = data.access_token as string;
  TOKEN_EXPIRES_AT_MS = Date.now() + Math.max(0, (ttl - 30) * 1000); // refresh 30s early
  return CACHED_TOKEN;
}

export async function startAnalysis(payload: any): Promise<any> {
  const token = await getAccessToken();
  const logPayload = {
    repo_url: payload?.repo_url || payload?.repoUrl,
    github_token: payload?.github_token || payload?.githubToken ? '(provided)' : '(none)',
    branch: payload?.branch,
    scanners: payload?.scanners,
    semgrep_config_path: payload?.semgrep_config_path,
    timeout_seconds: payload?.timeout_seconds,
  };
  debug('startAnalysis: POST', `${ANALYZER_BASE_URL}/api/v1/analyze`, 'payload:', logPayload);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  debug('startAnalysis: response', res.status);
  if (!res.ok) {
    const t = await res.text();
    debug('startAnalysis: error body', t);
    throw new Error(`Analyzer start failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<any> {
  const token = await getAccessToken();
  debug('getJob: GET', `${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  debug('getJob: response', res.status);
  if (!res.ok) throw new Error(`Analyzer job failed: ${res.status}`);
  return res.json();
}

export async function getSow(jobId: string): Promise<any> {
  const token = await getAccessToken();
  debug('getSow: GET', `${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/sow`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/sow`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  debug('getSow: response', res.status);
  if (!res.ok) throw new Error(`Analyzer sow failed: ${res.status}`);
  return res.json();
}

export async function getCapabilities(): Promise<any> {
  const token = await getAccessToken();
  debug('getCapabilities: GET', `${ANALYZER_BASE_URL}/api/v1/capabilities`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/capabilities`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  debug('getCapabilities: response', res.status);
  if (!res.ok) throw new Error(`Analyzer capabilities failed: ${res.status}`);
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  const token = await getAccessToken();
  debug('cancelJob: POST', `${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/cancel`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  debug('cancelJob: response', res.status);
  if (!res.ok) throw new Error(`Analyzer cancel failed: ${res.status}`);
}

export async function getPlan(payload: any): Promise<any> {
  const token = await getAccessToken();
  debug('getPlan: POST', `${ANALYZER_BASE_URL}/api/v1/plan`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/plan`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  debug('getPlan: response', res.status);
  if (!res.ok) throw new Error(`Analyzer plan failed: ${res.status}`);
  return res.json();
}

export async function getReport(jobId: string, name: string): Promise<{ name: string; content: string }> {
  const token = await getAccessToken();
  debug('getReport: GET', `${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/reports/${name}`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/jobs/${jobId}/reports/${encodeURIComponent(name)}`, {
    headers: { 'authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  debug('getReport: response', res.status);
  if (!res.ok) throw new Error(`Analyzer report failed: ${res.status}`);
  return res.json();
}

export async function getAggregate(payload: { repo_url: string; website_url?: string }): Promise<any> {
  const token = await getAccessToken();
  const body: any = { repo_url: payload.repo_url };
  if (payload.website_url) body.semgrep_config_path = payload.website_url; // piggyback param
  debug('getAggregate: POST', `${ANALYZER_BASE_URL}/api/v1/aggregate`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/aggregate`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  debug('getAggregate: response', res.status);
  if (!res.ok) throw new Error(`Analyzer aggregate failed: ${res.status}`);
  return res.json();
}

export async function featureScan(payload: { repo_url: string; features: Array<{ name: string; keywords?: string[]; file_globs?: string[]; robust_signals?: string[] }>; branch?: string; github_token?: string }): Promise<any> {
  const token = await getAccessToken();
  debug('featureScan: POST', `${ANALYZER_BASE_URL}/api/v1/features`);
  const res = await fetch(`${ANALYZER_BASE_URL}/api/v1/features`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  debug('featureScan: response', res.status);
  if (!res.ok) throw new Error(`Analyzer features failed: ${res.status}`);
  return res.json();
}


