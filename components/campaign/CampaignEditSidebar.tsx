'use client';

interface Campaign {
  id: string;
  status: string;
  reviewStatus?: string | null;
  reviewFeedback?: string | null;
  reviewedAt?: string | Date | null;
}

interface FormData {
  imageUrl: string;
  leadVideoUrl: string;
  repoUrl: string;
  milestones: any[];
  priceTiers: any[];
}

interface GitHubConnection {
  connected: boolean;
  connection?: { username?: string | null };
}

interface CampaignEditSidebarProps {
  campaign: Campaign;
  formData: FormData;
  githubConnection: GitHubConnection | null;
  githubAppConnected: boolean | null;
  isSubmittingForReview: boolean;
  onSubmitForReview: () => void;
  onSetGitHubModalOpen: (open: boolean) => void;
  onSetGitHubAppModalOpen: (open: boolean) => void;
}

export default function CampaignEditSidebar({
  campaign,
  formData,
  githubConnection,
  githubAppConnected,
  isSubmittingForReview,
  onSubmitForReview,
  onSetGitHubModalOpen,
  onSetGitHubAppModalOpen
}: CampaignEditSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6 mt-8 lg:mt-0">
      {/* GitHub Integration Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">GitHub Integration</h3>
        
        <div className="space-y-3">
          {/* Repository URL */}
          {formData.repoUrl && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Repository:</span>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={formData.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                >
                  {formData.repoUrl.replace('https://github.com/', '')}
                </a>
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">Connection:</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${githubConnection?.connected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                {githubConnection?.connected ? 'Connected' : 'Not connected'}
              </span>
              {githubConnection?.connected ? (
                <button
                  type="button"
                  onClick={() => onSetGitHubModalOpen(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Refresh connection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetGitHubModalOpen(true)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
          
          {/* App Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">App:</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${githubAppConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                {githubAppConnected ? 'Installed' : 'Needs auth'}
              </span>
              {githubAppConnected ? (
                <button
                  type="button"
                  onClick={() => onSetGitHubAppModalOpen(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Re-authenticate app"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetGitHubAppModalOpen(true)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Launch Checklist */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Launch Checklist</h3>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            campaign.status === 'draft' 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : campaign.status === 'live' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>
        
        <div className="space-y-4">
          {/* Campaign Narrative Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Campaign Narrative</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Lead Image</span>
                <div className="flex items-center">
                  {formData.imageUrl ? (
                    <span className="text-green-500 text-xs font-medium">✓ Required</span>
                  ) : (
                    <span className="text-red-500 text-xs font-medium">✗ Required</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Lead Video</span>
                <div className="flex items-center">
                  {formData.leadVideoUrl ? (
                    <span className="text-green-500 text-xs font-medium">✓ Recommended</span>
                  ) : (
                    <span className="text-gray-500 text-xs font-medium">⚬ Recommended</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Milestones</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formData.milestones.length} milestone{formData.milestones.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center">
                {formData.milestones.length > 0 ? (
                  <span className="text-green-500 text-xs font-medium">✓ Created</span>
                ) : (
                  <span className="text-gray-500 text-xs font-medium">⚬ Optional</span>
                )}
              </div>
            </div>
          </div>

          {/* Price Tiers Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Price Tiers</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formData.priceTiers.length} tier{formData.priceTiers.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center">
                {formData.priceTiers.length > 0 ? (
                  <span className="text-green-500 text-xs font-medium">✓ Created</span>
                ) : (
                  <span className="text-gray-500 text-xs font-medium">⚬ Optional</span>
                )}
              </div>
            </div>
          </div>

          {/* Review Status & Launch */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Review Feedback */}
            {campaign.reviewFeedback && campaign.reviewStatus === 'needs_changes' && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Admin Feedback</h5>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">{campaign.reviewFeedback}</p>
                {campaign.reviewedAt && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    Reviewed on {new Date(campaign.reviewedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Launch Status */}
            <div className="space-y-3">
              {campaign.reviewStatus === 'pending_review' ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Launch Status</span>
                  <span className="text-blue-500 text-xs font-medium">📋 Under Review</span>
                </div>
              ) : campaign.reviewStatus === 'approved' ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Launch Status</span>
                  <span className="text-green-500 text-xs font-medium">✅ Approved</span>
                </div>
              ) : campaign.reviewStatus === 'needs_changes' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Launch Status</span>
                    <span className="text-yellow-500 text-xs font-medium">⚠ Changes Requested</span>
                  </div>
                  {formData.imageUrl && (
                    <button
                      onClick={onSubmitForReview}
                      disabled={isSubmittingForReview}
                      className="w-full px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                    >
                      {isSubmittingForReview ? 'Resubmitting...' : 'Resubmit for Review'}
                    </button>
                  )}
                </div>
              ) : (
                // Not submitted yet
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Ready to Launch</span>
                    <div className="flex items-center">
                      {formData.imageUrl ? (
                        <span className="text-green-500 text-xs font-medium">✓ Ready</span>
                      ) : (
                        <span className="text-yellow-500 text-xs font-medium">⚠ Missing Required</span>
                      )}
                    </div>
                  </div>
                  {formData.imageUrl ? (
                    <button
                      onClick={onSubmitForReview}
                      disabled={isSubmittingForReview}
                      className="w-full px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                    >
                      {isSubmittingForReview ? 'Submitting...' : 'Submit for Review'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add a lead image to meet minimum requirements
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
