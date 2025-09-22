'use client';

import Link from 'next/link';

interface Tab {
  id: string;
  label: string;
}

interface CampaignEditHeaderProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  campaignId: string;
  autoSaving: boolean;
  lastSaved: Date | null;
}

export default function CampaignEditHeader({
  tabs,
  activeTab,
  setActiveTab,
  campaignId,
  autoSaving,
  lastSaved
}: CampaignEditHeaderProps) {
  return (
    <div className="mb-8">
      {/* Top bar with navigation and actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Campaign
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update your campaign details and content
            </p>
        </div>
           
        <div className="flex items-center space-x-4">
          {autoSaving && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving...
            </div>
          )}
          {lastSaved && !autoSaving && (
            <div className="text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Last saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <Link 
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <Link 
            href={`/campaigns/${campaignId}`}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex space-x-8 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
