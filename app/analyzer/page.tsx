'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AnalyzerPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [sow, setSow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initialRepo = searchParams.get('repo') || searchParams.get('repoUrl') || '';
    if (initialRepo) setRepoUrl(initialRepo);
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
      const res = await fetch('/api/analyzer/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'start_failed');
      setJobId(data.job_id || data.jobId);
    } catch (e: any) {
      setError(e?.message || 'start_failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Analyzer</h1>
      <div className="space-y-2">
        <label className="block text-sm">Repository URL</label>
        <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo" className="w-full border rounded p-2" />
        <div className="flex gap-2">
          <a href="/api/github/app/start?redirect_to=/analyzer" className="px-3 py-2 border rounded">Connect GitHub App</a>
          <button onClick={start} className="px-3 py-2 bg-gray-900 text-white rounded">Start Analysis</button>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {jobId && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Job: {jobId}</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(status, null, 2)}</pre>
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


