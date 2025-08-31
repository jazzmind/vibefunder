'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AnalyzerPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [sow, setSow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [gap, setGap] = useState<any>(null);
  const timerRef = useRef<any>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initialRepo = searchParams.get('repo') || searchParams.get('repoUrl') || '';
    if (initialRepo) setRepoUrl(initialRepo);
    (async () => {
      try {
        setLoadingCaps(true);
        const res = await fetch('/api/analyzer/capabilities');
        const data = await res.json();
        if (res.ok) {
          setCapabilities(data);
          const defaults: Record<string, boolean> = {};
          (data.scanners || []).forEach((s: any) => {
            defaults[s.name] = !!s.available;
          });
          setSelected(defaults);
        }
      } catch (e: any) {
        // ignore
      } finally {
        setLoadingCaps(false);
      }
    })();
  }, [searchParams]);

  useEffect(() => {
    const auto = searchParams.get('auto');
    if (!repoUrl) return;
    if (auto && (auto === '1' || auto === 'true')) {
      start();
    }
  }, [searchParams, repoUrl]);

  useEffect(() => {
    if (!jobId) return;
    timerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyzer/jobs/${jobId}`);
        const data = await res.json();
        setStatus(data);
        if (data.status === 'succeeded') {
          clearInterval(timerRef.current);
          const sowRes = await fetch(`/api/analyzer/jobs/${jobId}/sow`);
          const sowData = await sowRes.json();
          setSow(sowData.sow_markdown || sowData.sowMarkdown || '');
        }
        if (data.status === 'failed') {
          clearInterval(timerRef.current);
        }
      } catch (e: any) {
        setError(e?.message || 'polling_failed');
        clearInterval(timerRef.current);
      }
    }, 2000);
    return () => clearInterval(timerRef.current);
  }, [jobId]);

  const start = async () => {
    setError(null);
    setSow(null);
    setStatus(null);
    setJobId(null);
    try {
      const scanners = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await fetch('/api/analyzer/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, scanners }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'start_failed');
      setJobId(data.job_id || data.jobId);
    } catch (e: any) {
      setError(e?.message || 'start_failed');
    }
  };

  const cancel = async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/analyzer/jobs/${jobId}/cancel`, { method: 'POST' });
    } catch {}
  };

  const runPlan = async () => {
    setPlan(null);
    try {
      const res = await fetch('/api/analyzer/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json();
      if (res.ok) setPlan(data);
    } catch {}
  };

  const runGap = async () => {
    if (!jobId) return;
    try {
      const res = await fetch('/api/analyzer/gap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, repo_url: repoUrl }),
      });
      const data = await res.json();
      if (res.ok) setGap(data);
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analyzer</h1>
        <div className="flex items-center gap-2 text-sm">
          {(() => {
            const cid = searchParams.get('campaignId') || searchParams.get('campaign_id');
            if (!cid) return null;
            return (
              <Link href={`/campaigns/${cid}`} className="inline-flex items-center px-3 py-1.5 rounded border text-gray-700 hover:bg-gray-50">
                ← Back to Campaign
              </Link>
            );
          })()}
          <Link href="/dashboard" className="inline-flex items-center px-3 py-1.5 rounded border text-gray-700 hover:bg-gray-50">
            Dashboard
          </Link>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Repository URL</label>
        <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo" className="w-full border rounded p-2" />
        <div className="pt-2">
          <div className="text-sm font-medium mb-1">Scanners</div>
          <div className="flex gap-4 items-center text-sm">
            {(capabilities?.scanners || [
              { name: 'semgrep', available: true },
              { name: 'gitleaks', available: true },
              { name: 'sbom', available: true },
            ]).map((s: any) => (
              <label key={s.name} className={`inline-flex items-center gap-1 ${s.available ? '' : 'opacity-50'}`}>
                <input
                  type="checkbox"
                  disabled={!s.available}
                  checked={!!selected[s.name]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [s.name]: e.target.checked }))}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/api/github/app/start?redirect_to=/analyzer" className="px-3 py-2 border rounded">Connect GitHub App</a>
          <button onClick={start} className="px-3 py-2 bg-gray-900 text-white rounded">Start Analysis</button>
          <button onClick={runPlan} className="px-3 py-2 border rounded">Plan</button>
        </div>
      </div>
      {plan && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Plan</div>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(plan, null, 2)}</pre>
        </div>
      )}
      {error && <div className="text-red-600">{error}</div>}
      {jobId && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Job: {jobId}</div>
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="px-3 py-1.5 text-sm border rounded">Cancel</button>
            <button onClick={runGap} className="px-3 py-1.5 text-sm border rounded">Generate Gap Analysis</button>
          </div>
          {Array.isArray(status?.steps) && (
            <div className="space-y-1 text-sm">
              {status.steps.map((st: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 border rounded px-2 py-1">
                  <div>
                    <span className="font-medium">{st.name}</span>
                    {st.message ? <span className="text-gray-500 ml-2">{st.message}</span> : null}
                  </div>
                  <div className="text-gray-600">{st.status}</div>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(status?.reports_present) && status.reports_present.length > 0 && (
            <div className="text-sm">
              <div className="font-medium mb-1">Reports present</div>
              <ul className="list-disc list-inside text-gray-700">
                {status.reports_present.map((r: string) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
      {gap && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Recommended Milestones and Scopes</h2>
          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(gap, null, 2)}</pre>
        </div>
      )}
      {sow && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Statement of Work (Draft)</h2>
          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto whitespace-pre-wrap">{sow}</pre>
        </div>
      )}
    </div>
  );
}



