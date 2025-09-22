'use client';

interface FormData {
  requireBackerAccount: boolean;
  onlyBackersComment: boolean;
}

interface Campaign {
  status: string;
}

interface SettingsTabProps {
  formData: FormData;
  campaign: Campaign;
  onInputChange: (field: string, value: any) => void;
}

export default function SettingsTab({
  formData,
  campaign,
  onInputChange
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={formData.requireBackerAccount}
              onChange={(e) => onInputChange('requireBackerAccount', e.target.checked)}
              className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Require backer account
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Backers must create an account to pledge to this campaign
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              checked={formData.onlyBackersComment}
              onChange={(e) => onInputChange('onlyBackersComment', e.target.checked)}
              className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Only backers can comment
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Restrict comments to users who have backed this campaign
            </p>
          </div>
        </div>
      </div>

      {campaign.status === 'draft' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">📋 Ready to Launch?</h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Once you're happy with your campaign, you can publish it to make it live. Make sure you have:
          </p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• Compelling title and description</li>
            <li>• Clear funding goal</li>
            <li>• High-quality lead image or video</li>
            <li>• Defined milestones and pledge tiers</li>
          </ul>
        </div>
      )}
    </div>
  );
}
