'use client';

import { useState } from 'react';
import Modal from '@/components/shared/Modal';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoUrl: string;
  onRepoUrlUpdate: (repoUrl: string) => void;
  onGenerateContent: (repoUrl: string, prompt?: string) => void;
}

export default function GitHubModal({
  isOpen,
  onClose,
  currentRepoUrl,
  onRepoUrlUpdate,
  onGenerateContent
}: GitHubModalProps) {
  const [repoUrl, setRepoUrl] = useState(currentRepoUrl);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!repoUrl.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateContent(repoUrl, userPrompt.trim() || undefined);
      onRepoUrlUpdate(repoUrl);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate content from repository. Please check the URL and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateRepo = () => {
    onRepoUrlUpdate(repoUrl);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="GitHub Repository Integration"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Repository URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Repository URL *
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="https://github.com/username/repository"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter the GitHub repository URL you want to link to this campaign
          </p>
        </div>

        {/* User Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Add any specific focus areas, target audience, or additional context for content generation..."
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Provide additional context to help tailor the generated content to your needs
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                What happens when you generate content?
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="space-y-1">
                  <li>• AI analyzes your repository's README and documentation</li>
                  <li>• Automatically suggests campaign title, description, and goals</li>
                  <li>• Creates relevant milestones and pricing tiers</li>
                  <li>• Content will be merged with your existing campaign data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            <a
              href="/api/github/app/start?redirect_to=/analyzer"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Connect GitHub App
            </a>
            <button
              type="button"
              onClick={handleUpdateRepo}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Update Repository Only
            </button>
            
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !repoUrl.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>Generate Content</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}