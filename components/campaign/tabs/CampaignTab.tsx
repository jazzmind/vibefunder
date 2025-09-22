'use client';

import { X, ImageIcon, Video } from 'lucide-react';
import TiptapEditor from '@/components/editor/TiptapEditor';
import AIContentEnhancer from '@/components/campaign/AIContentEnhancer';


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
  
interface FormData {
  title: string;
  summary: string;
  description: string;
  fundingGoal: number;
  imageUrl: string;
  leadVideoUrl: string;
  deployModes: string[];
  sectors: string[];
  websiteUrl: string;
  repoUrl: string;
}

interface CampaignTabProps {
  formData: FormData;
  errors: Record<string, string>;
  onInputChange: (field: string, value: any) => void;
  onArrayChange: (field: 'deployModes' | 'sectors', value: string, checked: boolean) => void;
  onOpenMediaModal: (type: 'image' | 'video', forEditor?: boolean) => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
}

export default function CampaignTab({
  formData,
  errors,
  onInputChange,
  onArrayChange,
  onOpenMediaModal,
  onShowMessage
}: CampaignTabProps) {
  // Website generation handler
  const handleGenerateFromWebsite = async (websiteUrl: string) => {
    try {
      const response = await fetch('/api/services/generate-from-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: websiteUrl, autoCreate: false })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate from website');
      }
      const result = await response.json();
      const generated = result.generated;
      
      // Update form with generated content
      onInputChange('title', generated.name || formData.title);
      onInputChange('summary', formData.summary || (generated.valueProposition || generated.description || '').slice(0, 200));
      onInputChange('description', generated.description || formData.description);
      onInputChange('websiteUrl', websiteUrl);
      
      onShowMessage('Campaign content updated from website', 'success');
    } catch (error) {
      console.error('Generate from website error:', error);
      onShowMessage('Failed to generate content from website', 'error');
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Campaign Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
            errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="Enter a compelling campaign title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
      </div>

      {/* Project Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Website
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={formData.websiteUrl || ''}
            onChange={(e) => onInputChange('websiteUrl', e.target.value)}
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="https://example.com"
          />
            <button
              type="button"
              onClick={() => formData.websiteUrl && handleGenerateFromWebsite(formData.websiteUrl)}
              className={`px-4 py-2 bg-gray-900 text-white rounded-lg transition-colors ${formData.websiteUrl ? 'hover:bg-gray-800' : 'opacity-50 pointer-events-none'}`}
            >
              Generate
            </button>
          {formData.websiteUrl && (
            <button
              type="button"
              onClick={() => window.open(formData.websiteUrl!, '_blank')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">We can analyze your website to enrich campaign content.</p>
      </div>

      {/* Lead Media Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lead Image
          </label>
          <div className="space-y-3">
            {formData.imageUrl ? (
              <div className="relative">
                <img 
                  src={formData.imageUrl} 
                  alt="Lead image preview" 
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => onInputChange('imageUrl', '')}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No image selected</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenMediaModal('image')}
              className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              {formData.imageUrl ? 'Change Image' : 'Select Image'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This image appears on campaign cards and at the top of your campaign page
          </p>
        </div>

        {/* Lead Video */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lead Video
          </label>
          <div className="space-y-3">
            {formData.leadVideoUrl ? (
              <div className="relative">
                <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-8 h-8 text-brand mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Video Selected</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-40">
                      {formData.leadVideoUrl.length > 40 
                        ? formData.leadVideoUrl.substring(0, 40) + '...' 
                        : formData.leadVideoUrl}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onInputChange('leadVideoUrl', '')}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No video selected</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenMediaModal('video')}
              className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              {formData.leadVideoUrl ? 'Change Video' : 'Select Video'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            YouTube/Vimeo URL. If provided, this video will be featured prominently on your campaign page
          </p>
        </div>
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
          onChange={(e) => onInputChange('fundingGoal', Number(e.target.value))}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
            errors.fundingGoal ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="e.g., 50000"
        />
        {errors.fundingGoal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fundingGoal}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Short Summary *
        </label>
        <textarea
          value={formData.summary}
          onChange={(e) => onInputChange('summary', e.target.value)}
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
          Campaign Narrative
        </label>
        <div className="h-[75vh] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <TiptapEditor
            content={formData.description}
            onChange={(content) => onInputChange('description', content)}
            placeholder="Write a detailed narrative of your campaign. Use the toolbar to format text, add links, images, and more..."
            maxLength={10000}
            className="h-full"
            onOpenMediaLibrary={() => onOpenMediaModal('image', true)}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Use the toolbar to format your text with headings, lists, links, images, and more.
        </p>
      </div>

      {/* AI Content Enhancer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <AIContentEnhancer
          title={formData.title}
          summary={formData.summary}
          content={formData.description}
          repoUrl={formData.repoUrl}
          websiteUrl={formData.websiteUrl}
          onTitleUpdate={(newTitle) => onInputChange('title', newTitle)}
          onSummaryUpdate={(newSummary) => onInputChange('summary', newSummary)}
          onContentUpdate={(newContent) => onInputChange('description', newContent)}
        />
      </div>

      {/* Deployment Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Deployment Options *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DEPLOYMENT_OPTIONS.map((option: { value: string; label: string }) => (
            <label key={option.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={formData.deployModes.includes(option.value)}
                onChange={(e) => onArrayChange('deployModes', option.value, e.target.checked)}
                className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.deployModes && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.deployModes}</p>}
      </div>

      {/* Target Sectors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Target Sectors
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SECTOR_OPTIONS.map((option: { value: string; label: string }) => (
            <label key={option.value} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={formData.sectors.includes(option.value)}
                onChange={(e) => onArrayChange('sectors', option.value, e.target.checked)}
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
  );
}
