'use client';

import { useState } from 'react';
import { GithubIcon, FileIcon, ArrowLeftIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';

interface Session {
  userId: string;
  email: string;
}

interface Props {
  createManualCampaign: (formData: FormData) => Promise<void>;
  session: Session;
}

type CreationMethod = 'github' | 'manual' | null;
type WizardStep = 'method' | 'github-setup' | 'github-generate' | 'manual-form';

interface GitHubFormData {
  repoUrl: string;
  githubToken: string;
}

interface GeneratedCampaign {
  title: string;
  summary: string;
  description: string;
  fundingGoalDollars: number;
  sectors: string[];
  deployModes: string[];
  milestones: any[];
  pledgeTiers: any[];
}

export default function CampaignCreationWizard({ createManualCampaign, session }: Props) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('method');
  const [creationMethod, setCreationMethod] = useState<CreationMethod>(null);
  const [gitHubData, setGitHubData] = useState<GitHubFormData>({ repoUrl: '', githubToken: '' });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);

  const handleMethodSelect = (method: CreationMethod) => {
    setCreationMethod(method);
    if (method === 'github') {
      setCurrentStep('github-setup');
    } else if (method === 'manual') {
      setCurrentStep('manual-form');
    }
  };

  const handleGitHubFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // First, connect GitHub account if token provided
      if (gitHubData.githubToken) {
        const connectResponse = await fetch('/api/github/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ githubToken: gitHubData.githubToken })
        });

        if (!connectResponse.ok) {
          const error = await connectResponse.json();
          throw new Error(error.error || 'Failed to connect GitHub account');
        }
      }

      // Generate campaign from repository
      setCurrentStep('github-generate');
      setIsVerifying(false);
      setIsGenerating(true);

      const generateResponse = await fetch('/api/campaigns/generate-from-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: gitHubData.repoUrl,
          autoCreate: true 
        })
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.error || 'Failed to generate campaign');
      }

      const result = await generateResponse.json();
      
      // Redirect to the created campaign
      if (result.campaign?.id) {
        window.location.href = `/campaigns/${result.campaign.id}?new=true&from=github`;
      } else {
        throw new Error('Campaign creation failed');
      }

    } catch (error) {
      console.error('GitHub campaign creation error:', error);
      setVerificationError(error instanceof Error ? error.message : 'An error occurred');
      setIsVerifying(false);
      setIsGenerating(false);
      
      // If we're in generate step, go back to setup
      if (currentStep === 'github-generate') {
        setCurrentStep('github-setup');
      }
    }
  };

  const renderMethodSelection = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Create Your Campaign</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">Choose how you'd like to get started</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* GitHub Option */}
        <div 
          onClick={() => handleMethodSelect('github')}
          className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-brand hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-gray-900 dark:bg-white rounded-xl mb-6 group-hover:scale-110 transition-transform duration-200">
            <GithubIcon className="w-8 h-8 text-white dark:text-gray-900" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">From GitHub Repository</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your GitHub repository and we'll automatically generate your campaign content from your README and documentation.
          </p>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              Auto-generates compelling campaign content
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              Creates milestones and funding tiers
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              Links project documentation
            </div>
          </div>

          <div className="btn w-full text-center group-hover:bg-brand-dark transition-colors duration-200">
            Get Started with GitHub
          </div>
        </div>

        {/* Manual Option */}
        <div 
          onClick={() => handleMethodSelect('manual')}
          className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-brand hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-brand rounded-xl mb-6 group-hover:scale-110 transition-transform duration-200">
            <FileIcon className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Manual Creation</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create your campaign from scratch with full control over every detail. Perfect for non-technical projects or custom approaches.
          </p>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              Complete creative control
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              Custom funding goals and tiers
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
              No technical requirements
            </div>
          </div>

          <div className="btn-secondary w-full text-center group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-200">
            Create Manually
          </div>
        </div>
      </div>
    </div>
  );

  const renderGitHubSetup = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <button 
          onClick={() => setCurrentStep('method')}
          className="flex items-center text-brand hover:text-brand-dark mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to selection
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Connect GitHub Repository</h1>
        <p className="text-gray-600 dark:text-gray-300">We'll analyze your repository and generate campaign content automatically</p>
      </div>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">Prefer GitHub App?</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Connect via the VibeFunder GitHub App for repository access without personal tokens.</div>
        </div>
        <a href="/api/github/app/start?redirect_to=/analyzer" className="px-4 py-2 border rounded-lg text-sm">Connect GitHub App</a>
      </div>

      {verificationError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <AlertTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-300">{verificationError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleGitHubFormSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Repository URL
          </label>
          <input 
            id="repoUrl"
            type="url"
            value={gitHubData.repoUrl}
            onChange={(e) => setGitHubData(prev => ({ ...prev, repoUrl: e.target.value }))}
            placeholder="https://github.com/username/repository-name" 
            required 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Public repositories work without a token</p>
        </div>

        <div>
          <label htmlFor="githubToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            GitHub Personal Access Token (Optional)
          </label>
          <input 
            id="githubToken"
            type="password"
            value={gitHubData.githubToken}
            onChange={(e) => setGitHubData(prev => ({ ...prev, githubToken: e.target.value }))}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Required for private repositories</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to get a GitHub Personal Access Token:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">GitHub Settings → Developer settings → Personal access tokens</a></li>
            <li>Click "Generate new token (classic)"</li>
            <li>Give it a name like "VibeFunder Campaign Creator"</li>
            <li>Select the "repo" scope for repository access</li>
            <li>Click "Generate token" and copy the token</li>
          </ol>
        </div>

        <button 
          type="submit" 
          disabled={isVerifying || !gitHubData.repoUrl}
          className="w-full btn py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Connecting...' : 'Generate Campaign from Repository'}
        </button>
      </form>
    </div>
  );

  const renderGitHubGenerate = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto mb-6">
          <GithubIcon className="w-8 h-8 text-white animate-pulse" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Generating Your Campaign</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          We're analyzing your repository and creating compelling campaign content...
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Reading repository content</span>
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Analyzing project structure</span>
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Generating campaign content</span>
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-400 dark:text-gray-500">Creating milestones and tiers</span>
              <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          This usually takes 15-30 seconds. We'll redirect you to your new campaign when ready.
        </p>
      </div>
    </div>
  );

  const renderManualForm = () => (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <button 
          onClick={() => setCurrentStep('method')}
          className="flex items-center text-brand hover:text-brand-dark mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to selection
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Create Campaign Manually</h1>
        <p className="text-gray-600 dark:text-gray-300">Fill in the details to create your campaign from scratch</p>
      </div>
      
      <form action={createManualCampaign} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign Title
          </label>
          <input 
            id="title"
            name="title" 
            placeholder="e.g., ApplicationAI - URL to Application Processor" 
            required 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Summary
          </label>
          <textarea 
            id="summary"
            name="summary" 
            placeholder="Describe your project in one compelling sentence..." 
            required 
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Detailed Description
          </label>
          <textarea 
            id="description"
            name="description" 
            placeholder="Provide more details about your project, target users, and value proposition..." 
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="fundingGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Funding Goal ($)
          </label>
          <input 
            id="fundingGoal"
            name="fundingGoal" 
            type="number" 
            step="1"
            placeholder="e.g., 50000" 
            required 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum funding needed to proceed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Deployment Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="saas" defaultChecked className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">SaaS (Cloud hosted)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="vpc" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">VPC (Private cloud)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="onprem" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">On-premises</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Target Sectors
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="technology" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Technology</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="healthcare" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Healthcare</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="education" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Education</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="finance" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Finance</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="retail" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Retail</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="insurance" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Insurance</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="manufacturing" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Manufacturing</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="sectors" value="government" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Government</span>
            </label>
          </div>
        </div>
        
        <button className="w-full btn py-3 text-base font-semibold" type="submit">
          Create Campaign
        </button>
      </form>
    </div>
  );

  // Render the appropriate step
  switch (currentStep) {
    case 'method':
      return renderMethodSelection();
    case 'github-setup':
      return renderGitHubSetup();
    case 'github-generate':
      return renderGitHubGenerate();
    case 'manual-form':
      return renderManualForm();
    default:
      return renderMethodSelection();
  }
}
