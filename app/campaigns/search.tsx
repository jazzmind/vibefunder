'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEPLOYMENT_MODES = [
  { value: 'all', label: 'All Deployments' },
  { value: 'saas', label: 'SaaS' },
  { value: 'vpc', label: 'VPC' },
  { value: 'onprem', label: 'On-Premise' },
  { value: 'hybrid', label: 'Hybrid' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'live', label: 'Live' },
  { value: 'funded', label: 'Funded' },
  { value: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'funding', label: 'Most Funded' },
  { value: 'progress', label: 'Highest Progress' },
  { value: 'goal', label: 'Largest Goal' },
];

export function CampaignSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [deployment, setDeployment] = useState(searchParams.get('deployment') || 'all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Update state when URL params change
    setSearch(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || 'all');
    setSort(searchParams.get('sort') || 'newest');
    setDeployment(searchParams.get('deployment') || 'all');
  }, [searchParams]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams();
    
    // Preserve existing params and add new ones
    const currentSearch = newParams.search !== undefined ? newParams.search : search;
    const currentStatus = newParams.status !== undefined ? newParams.status : status;
    const currentSort = newParams.sort !== undefined ? newParams.sort : sort;
    const currentDeployment = newParams.deployment !== undefined ? newParams.deployment : deployment;
    
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus && currentStatus !== 'all') params.set('status', currentStatus);
    if (currentSort && currentSort !== 'newest') params.set('sort', currentSort);
    if (currentDeployment && currentDeployment !== 'all') params.set('deployment', currentDeployment);
    
    router.push(`/campaigns?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search });
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setSort('newest');
    setDeployment('all');
    router.push('/campaigns');
  };

  const hasActiveFilters = search || status !== 'all' || sort !== 'newest' || deployment !== 'all';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button type="submit" className="btn px-6">Search</button>
          <button 
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary px-4 flex items-center gap-2"
          >
            Filters
            <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  updateFilters({ status: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateFilters({ sort: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deployment
              </label>
              <select
                value={deployment}
                onChange={(e) => {
                  setDeployment(e.target.value);
                  updateFilters({ deployment: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {DEPLOYMENT_MODES.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {search && (
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm">
                    Search: "{search}"
                  </span>
                )}
                {status !== 'all' && (
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm">
                    Status: {STATUS_OPTIONS.find(o => o.value === status)?.label}
                  </span>
                )}
                {sort !== 'newest' && (
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm">
                    Sort: {SORT_OPTIONS.find(o => o.value === sort)?.label}
                  </span>
                )}
                {deployment !== 'all' && (
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm">
                    Deployment: {DEPLOYMENT_MODES.find(o => o.value === deployment)?.label}
                  </span>
                )}
              </div>
              <button 
                onClick={clearFilters}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}