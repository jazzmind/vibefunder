'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageGenerator from '@/app/components/campaign/ImageGenerator';
import AIContentEnhancer from '@/app/components/campaign/AIContentEnhancer';
import AIMilestoneSuggestions from '@/app/components/campaign/AIMilestoneSuggestions';
import AIStretchGoalSuggestions from '@/app/components/campaign/AIStretchGoalSuggestions';
import TiptapEditor from '@/app/components/editor/TiptapEditor';

interface Milestone {
  id?: string;
  name: string;
  pct: number;
  acceptance: {
    checklist: string[];
  };
}

interface StretchGoal {
  id?: string;
  title: string;
  description: string;
  targetDollars: number;
  order?: number;
}

interface Campaign {
  id: string;
  title: string;
  summary: string;
  description: string | null;
  fundingGoalDollars: number;
  image: string | null;
  leadVideoUrl: string | null;
  deployModes: string[];
  sectors: string[];
  requireBackerAccount: boolean;
  onlyBackersComment: boolean;
  status: string;
  milestones?: Milestone[];
  stretchGoals?: StretchGoal[];
}

interface CampaignEditFormProps {
  campaign: Campaign;
  isAdmin: boolean;
}

const DEPLOYMENT_OPTIONS = [
  { value: 'saas', label: 'SaaS (Cloud hosted)' },
  { value: 'vpc', label: 'VPC (Private cloud)' },
  { value: 'onprem', label: 'On-premises' },
  { value: 'hybrid', label: 'Hybrid deployment' },
];

const SECTOR_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'retail', label: 'Retail' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'government', label: 'Government' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'real-estate', label: 'Real Estate' },
];

export default function CampaignEditForm({ campaign, isAdmin }: CampaignEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state
  const [formData, setFormData] = useState({
    title: campaign.title,
    summary: campaign.summary,
    description: campaign.description || '',
    fundingGoal: campaign.fundingGoalDollars,
    imageUrl: campaign.image || '',
    leadVideoUrl: campaign.leadVideoUrl || '',
    deployModes: campaign.deployModes,
    sectors: campaign.sectors,
    requireBackerAccount: campaign.requireBackerAccount,
    onlyBackersComment: campaign.onlyBackersComment,
    milestones: campaign.milestones || [],
    stretchGoals: campaign.stretchGoals || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Autosave functionality
  const autoSave = async () => {
    if (autoSaving) return;
    
    setAutoSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          summary: formData.summary,
          description: formData.description,
          fundingGoalDollars: Math.round(formData.fundingGoal),
          image: formData.imageUrl || null,
          leadVideoUrl: formData.leadVideoUrl || null,
          deployModes: formData.deployModes,
          sectors: formData.sectors,
          requireBackerAccount: formData.requireBackerAccount,
          onlyBackersComment: formData.onlyBackersComment,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Autosave every 10 seconds when there are changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.title || formData.summary || formData.description) {
        autoSave();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [formData.title, formData.summary, formData.description]);

  const handleArrayChange = (field: 'deployModes' | 'sectors', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const addMilestone = (milestone: Omit<Milestone, 'id'>) => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { ...milestone, id: `temp-${Date.now()}` }]
    }));
  };

  const updateMilestone = (index: number, milestone: Milestone) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => i === index ? milestone : m)
    }));
  };

  const deleteMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const addStretchGoal = (goal: Omit<StretchGoal, 'id' | 'order'>) => {
    setFormData(prev => ({
      ...prev,
      stretchGoals: [...prev.stretchGoals, { 
        ...goal, 
        id: `temp-${Date.now()}`,
        order: prev.stretchGoals.length + 1
      }]
    }));
  };

  const updateStretchGoal = (index: number, goal: StretchGoal) => {
    setFormData(prev => ({
      ...prev,
      stretchGoals: prev.stretchGoals.map((g, i) => i === index ? goal : g)
    }));
  };

  const deleteStretchGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stretchGoals: prev.stretchGoals.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.summary.trim()) newErrors.summary = 'Summary is required';
    if (formData.fundingGoal <= 0) newErrors.fundingGoal = 'Funding goal must be greater than 0';
    if (formData.deployModes.length === 0) newErrors.deployModes = 'Select at least one deployment option';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            summary: formData.summary,
            description: formData.description,
            fundingGoalDollars: Math.round(formData.fundingGoal),
            image: formData.imageUrl || null,
            leadVideoUrl: formData.leadVideoUrl || null,
            deployModes: formData.deployModes,
            sectors: formData.sectors,
            requireBackerAccount: formData.requireBackerAccount,
            onlyBackersComment: formData.onlyBackersComment,
          }),
        });

        if (response.ok) {
          setSuccess('Campaign updated successfully!');
          setTimeout(() => {
            router.push(`/campaigns/${campaign.id}`);
          }, 1500);
        } else {
          const data = await response.json();
          setErrors({ submit: data.error || 'Failed to update campaign' });
        }
      } catch (error) {
        setErrors({ submit: 'Network error occurred' });
      }
    });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'media', label: 'Media', icon: '🎬' },
    { id: 'targeting', label: 'Targeting', icon: '🎯' },
    { id: 'milestones', label: 'Milestones', icon: '🎯' },
    { id: 'stretch-goals', label: 'Stretch Goals', icon: '🚀' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {autoSaving && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </div>
            )}
            {lastSaved && !autoSaving && (
              <div className="text-sm text-green-600 dark:text-green-400">
                ✓ Last saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Enter a compelling campaign title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Short Summary *
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                errors.summary ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Brief description for campaign cards (2-3 sentences)"
            />
            {errors.summary && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.summary}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detailed Description
            </label>
            <TiptapEditor
              content={formData.description}
              onChange={(content) => handleInputChange('description', content)}
              placeholder="Write a detailed description of your campaign. Use the toolbar to format text, add links, images, and more..."
              maxLength={10000}
              className="min-h-[300px]"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Use the toolbar to format your text with headings, lists, links, images, and more.
            </p>
          </div>

          {/* AI Content Enhancer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <AIContentEnhancer
              content={formData.description}
              title={formData.title}
              summary={formData.summary}
              onContentUpdate={(newContent) => handleInputChange('description', newContent)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Funding Goal ($) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={formData.fundingGoal}
              onChange={(e) => handleInputChange('fundingGoal', Number(e.target.value))}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                errors.fundingGoal ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="e.g., 50000"
            />
            {errors.fundingGoal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fundingGoal}</p>}
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lead Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleInputChange('imageUrl', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://example.com/image.jpg"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This image appears on campaign cards and at the top of your campaign page
            </p>
            {formData.imageUrl && (
              <div className="mt-4">
                <img 
                  src={formData.imageUrl} 
                  alt="Lead image preview" 
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lead Video URL
            </label>
            <input
              type="url"
              value={formData.leadVideoUrl}
              onChange={(e) => handleInputChange('leadVideoUrl', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              YouTube or Vimeo URL. If provided, this video will be featured prominently on your campaign page
            </p>
          </div>

          {/* AI Image Generator */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">🤖 AI Image Generator</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Generate a custom lead image for your campaign using AI based on your campaign content.
            </p>
            <ImageGenerator 
              campaignId={campaign.id}
              currentImage={formData.imageUrl}
              onImageGenerated={(imageUrl) => handleInputChange('imageUrl', imageUrl)}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Media Tips</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Use high-quality images (1200x630px recommended)</li>
              <li>• Keep videos under 3 minutes for better engagement</li>
              <li>• Test your URLs to ensure they work correctly</li>
              <li>• Consider creating a compelling thumbnail for videos</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'targeting' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Deployment Options *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DEPLOYMENT_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.deployModes.includes(option.value)}
                    onChange={(e) => handleArrayChange('deployModes', option.value, e.target.checked)}
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.deployModes && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.deployModes}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Target Sectors
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SECTOR_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.sectors.includes(option.value)}
                    onChange={(e) => handleArrayChange('sectors', option.value, e.target.checked)}
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Select the industries or sectors your campaign targets
            </p>
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Campaign Milestones</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Define key checkpoints for your campaign development
              </p>
            </div>
          </div>

          {/* AI Milestone Suggestions */}
          <AIMilestoneSuggestions
            title={formData.title}
            summary={formData.summary}
            description={formData.description}
            fundingGoal={formData.fundingGoal}
            onMilestonesGenerated={(milestones) => {
              milestones.forEach(addMilestone);
            }}
          />

          {/* Current Milestones */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Current Milestones ({formData.milestones.length})
            </h5>
            
            {formData.milestones.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No milestones created yet. Use AI suggestions or add manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.milestones.map((milestone, index) => (
                  <div key={milestone.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h6 className="font-medium text-gray-900 dark:text-white">{milestone.name}</h6>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{milestone.pct}% completion</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMilestone(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded p-3">
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Acceptance Criteria:</h6>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {milestone.acceptance.checklist.map((item, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stretch-goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Stretch Goals</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Additional features or rewards for exceeding your funding goal
              </p>
            </div>
          </div>

          {/* AI Stretch Goal Suggestions */}
          <AIStretchGoalSuggestions
            title={formData.title}
            summary={formData.summary}
            description={formData.description}
            fundingGoal={formData.fundingGoal}
            onStretchGoalsGenerated={(goals) => {
              goals.forEach(addStretchGoal);
            }}
          />

          {/* Current Stretch Goals */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Current Stretch Goals ({formData.stretchGoals.length})
            </h5>
            
            {formData.stretchGoals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No stretch goals created yet. Use AI suggestions or add manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.stretchGoals.map((goal, index) => (
                  <div key={goal.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h6 className="font-medium text-gray-900 dark:text-white">{goal.title}</h6>
                        <p className="text-sm text-brand font-medium">${goal.targetDollars.toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStretchGoal(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{goal.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={formData.requireBackerAccount}
                  onChange={(e) => handleInputChange('requireBackerAccount', e.target.checked)}
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
                  onChange={(e) => handleInputChange('onlyBackersComment', e.target.checked)}
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
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </Link>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-8 py-3 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}