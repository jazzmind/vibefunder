'use client';

import { useState } from 'react';
import { GlobeIcon, FileIcon, ArrowLeftIcon, CheckCircleIcon, AlertTriangleIcon } from 'lucide-react';

export default function ServiceProviderCreationWizard({ isAdmin }: { isAdmin: boolean }) {
  type Step = 'method' | 'domain' | 'manual' | 'generating';
  const [step, setStep] = useState<Step>('method');
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateFromDomain(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/services/generate-from-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, autoCreate: false })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }
      const data = await res.json();
      // For MVP, route to admin/providers edit or show a success with JSON preview
      const params = new URLSearchParams({ preview: 'true' });
      sessionStorage.setItem('provider-draft', JSON.stringify(data.generated));
      window.location.href = isAdmin ? `/admin/services?tab=providers&success=Generated` : `/profile/business?${params.toString()}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      website: fd.get('website') || undefined,
      shortDescription: fd.get('shortDescription'),
      services: [] as string[] // TODO: allow category selection
    };
    try {
      const res = await fetch('/api/services/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Create failed');
      }
      const data = await res.json();
      window.location.href = isAdmin ? `/admin/services/providers/${data.organizationId}` : '/profile/business';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 'method') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Add Service Provider</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => setStep('domain')} className="group bg-white dark:bg-gray-800 p-6 rounded-xl border hover:border-brand transition">
            <div className="w-14 h-14 bg-brand rounded-lg flex items-center justify-center mb-4"><GlobeIcon className="text-white"/></div>
            <div className="text-left">
              <div className="text-xl font-semibold mb-2">From Website (Recommended)</div>
              <div className="text-gray-600 dark:text-gray-300">Paste a domain and we’ll auto-fill a professional profile.</div>
            </div>
          </button>
          <button onClick={() => setStep('manual')} className="group bg-white dark:bg-gray-800 p-6 rounded-xl border hover:border-brand transition">
            <div className="w-14 h-14 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center mb-4"><FileIcon className="text-white dark:text-gray-900"/></div>
            <div className="text-left">
              <div className="text-xl font-semibold mb-2">Add Manually</div>
              <div className="text-gray-600 dark:text-gray-300">Enter details yourself for full control.</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'domain') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => setStep('method')} className="flex items-center text-brand mb-4"><ArrowLeftIcon className="w-4 h-4 mr-2"/>Back</button>
        <h2 className="text-2xl font-bold mb-4">Generate From Website</h2>
        {error && <div className="mb-4 p-3 border border-red-300 text-red-700 rounded flex items-center"><AlertTriangleIcon className="w-4 h-4 mr-2"/>{error}</div>}
        <form onSubmit={handleGenerateFromDomain} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl border">
          <div>
            <label className="block text-sm mb-1">Company Website</label>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="https://company.com" className="w-full px-3 py-2 border rounded" required/>
            <p className="text-xs text-gray-500 mt-1">We’ll research public sources to prefill your profile.</p>
          </div>
          <button type="submit" disabled={isLoading} className="btn w-full">{isLoading? 'Generating…' : 'Generate Profile'}</button>
        </form>
      </div>
    );
  }

  // manual
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button onClick={() => setStep('method')} className="flex items-center text-brand mb-4"><ArrowLeftIcon className="w-4 h-4 mr-2"/>Back</button>
      <h2 className="text-2xl font-bold mb-4">Add Provider Manually</h2>
      {error && <div className="mb-4 p-3 border border-red-300 text-red-700 rounded flex items-center"><AlertTriangleIcon className="w-4 h-4 mr-2"/>{error}</div>}
      <form onSubmit={handleManualCreate} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl border">
        <div>
          <label className="block text-sm mb-1">Organization Name</label>
          <input name="name" className="w-full px-3 py-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Contact Email</label>
          <input name="email" type="email" className="w-full px-3 py-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Website</label>
          <input name="website" type="url" className="w-full px-3 py-2 border rounded" placeholder="https://" />
        </div>
        <div>
          <label className="block text-sm mb-1">Short Description</label>
          <textarea name="shortDescription" className="w-full px-3 py-2 border rounded" rows={3} required />
        </div>
        <button type="submit" disabled={isLoading} className="btn w-full">{isLoading? 'Creating…' : 'Create Provider'}</button>
        <p className="text-xs text-gray-500 mt-2"><CheckCircleIcon className="inline w-4 h-4 mr-1"/>You can add services and details after creating.</p>
      </form>
    </div>
  );
}






