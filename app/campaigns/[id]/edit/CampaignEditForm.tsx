'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, ImageIcon, Video } from 'lucide-react';
import ImageGenerator from '@/app/components/campaign/ImageGenerator';
import AIContentEnhancer from '@/app/components/campaign/AIContentEnhancer';
import AIMilestoneSuggestions from '@/app/components/campaign/AIMilestoneSuggestions';
import AIStretchGoalSuggestions from '@/app/components/campaign/AIStretchGoalSuggestions';
import TiptapEditor from '@/app/components/editor/TiptapEditor';
import ImageLibrary from '@/app/components/images/ImageLibrary';
import MediaSelectorModal from '@/app/components/shared/MediaSelectorModal';
import MilestoneStretchGoalModal, { MilestoneFormData, StretchGoalFormData } from '@/app/components/campaigns/MilestoneStretchGoalModal';
import PriceTierModal, { PriceTierFormData } from '@/app/components/campaigns/PriceTierModal';
import GitHubModal from '@/app/components/campaigns/GitHubModal';

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
  repoUrl?: string | null;
  milestones?: any[];
  stretchGoals?: any[];
  pledgeTiers?: any[];
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
  const [activeTab, setActiveTab] = useState('campaign');
  
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
    repoUrl: campaign.repoUrl || '',
    milestones: (campaign.milestones || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      pct: m.pct,
      acceptance: typeof m.acceptance === 'object' && m.acceptance ? m.acceptance : { checklist: [] }
    })),
    stretchGoals: (campaign.stretchGoals || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      targetDollars: g.targetDollars,
      order: g.order
    })),
    priceTiers: (campaign.pledgeTiers || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      amountDollars: t.amountDollars,
      benefits: Array.isArray(t.benefits) ? t.benefits : (t.benefits ? JSON.parse(t.benefits) : []),
      order: t.order
    })),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<'image' | 'video'>('image');
  const [insertIntoEditor, setInsertIntoEditor] = useState(false);
  
  // Modal state
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [stretchGoalModalOpen, setStretchGoalModalOpen] = useState(false);
  const [priceTierModalOpen, setPriceTierModalOpen] = useState(false);
  const [gitHubModalOpen, setGitHubModalOpen] = useState(false);
  
  // Editing state
  const [editingMilestone, setEditingMilestone] = useState<{index: number, data: any} | null>(null);
  const [editingStretchGoal, setEditingStretchGoal] = useState<{index: number, data: any} | null>(null);
  const [editingPriceTier, setEditingPriceTier] = useState<{index: number, data: any} | null>(null);
  
  // Autosave
  const formDataRef = useRef(formData);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMediaSelect = (mediaUrl: string, mediaType: 'image' | 'video', mediaId?: string) => {
    if (insertIntoEditor && mediaType === 'image') {
      // Insert image into TiptapEditor
      // We'll need to access the editor instance - for now, trigger a custom event
      window.dispatchEvent(new CustomEvent('insertImageIntoEditor', { detail: { url: mediaUrl } }));
    } else {
      // Set as lead media
      if (mediaType === 'image') {
        handleInputChange('imageUrl', mediaUrl);
      } else {
        handleInputChange('leadVideoUrl', mediaUrl);
      }
    }
    setMediaModalOpen(false);
    setInsertIntoEditor(false);
  };

  const openMediaModal = (type: 'image' | 'video', forEditor = false) => {
    setMediaModalType(type);
    setInsertIntoEditor(forEditor);
    setMediaModalOpen(true);
  };

  // Smart autosave - only saves when data actually changes
  const autoSave = useCallback(async () => {
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
          repoUrl: formData.repoUrl || null,
          milestones: formData.milestones,
          stretchGoals: formData.stretchGoals,
          priceTiers: formData.priceTiers,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        formDataRef.current = formData; // Update the reference after successful save
      }
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [formData, campaign.id, autoSaving]);

  // Smart autosave: only save when form data changes
  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Check if form data has actually changed
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(formDataRef.current);
    
    if (hasChanged && (formData.title || formData.summary)) {
      autosaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000); // Save 2 seconds after user stops typing
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData, autoSave]);

  // Initialize the reference
  useEffect(() => {
    formDataRef.current = formData;
  }, []);

  const handleArrayChange = (field: 'deployModes' | 'sectors', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const addMilestone = (milestone: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { ...milestone, id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }]
    }));
  };

  const updateMilestone = (index: number, milestone: any) => {
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

  const addStretchGoal = (goal: any) => {
    setFormData(prev => ({
      ...prev,
      stretchGoals: [...prev.stretchGoals, { 
        ...goal, 
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: prev.stretchGoals.length + 1
      }]
    }));
  };

  const updateStretchGoal = (index: number, goal: any) => {
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

  const addPriceTier = (tier: any) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: [...prev.priceTiers, { 
        ...tier, 
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: prev.priceTiers.length + 1
      }]
    }));
  };

  const updatePriceTier = (index: number, tier: any) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.map((t, i) => i === index ? tier : t)
    }));
  };

  const deletePriceTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.filter((_, i) => i !== index)
    }));
  };

  // Modal handlers
  const handleMilestoneSubmit = (data: MilestoneFormData) => {
    if (editingMilestone) {
      updateMilestone(editingMilestone.index, {
        name: data.name,
        pct: data.pct,
        acceptance: { checklist: data.checklistItems }
      });
      setEditingMilestone(null);
    } else {
      addMilestone({
        name: data.name,
        pct: data.pct,
        acceptance: { checklist: data.checklistItems }
      });
    }
  };

  const handleStretchGoalSubmit = (data: StretchGoalFormData) => {
    if (editingStretchGoal) {
      updateStretchGoal(editingStretchGoal.index, {
        title: data.title,
        description: data.description,
        targetDollars: data.targetDollars
      });
      setEditingStretchGoal(null);
    } else {
      addStretchGoal({
        title: data.title,
        description: data.description,
        targetDollars: data.targetDollars
      });
    }
  };

  const handlePriceTierSubmit = (data: PriceTierFormData) => {
    if (editingPriceTier) {
      updatePriceTier(editingPriceTier.index, {
        title: data.title,
        description: data.description,
        amountDollars: data.amountDollars,
        benefits: data.benefits
      });
      setEditingPriceTier(null);
    } else {
      addPriceTier({
        title: data.title,
        description: data.description,
        amountDollars: data.amountDollars,
        benefits: data.benefits
      });
    }
  };

  // GitHub integration handlers
  const handleRepoUrlUpdate = (repoUrl: string) => {
    handleInputChange('repoUrl', repoUrl);
  };

  const handleGenerateContent = async (repoUrl: string, userPrompt?: string) => {
    try {
      const response = await fetch('/api/campaigns/generate-from-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          userPrompt,
          autoCreate: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const result = await response.json();
      const generated = result.generated;

      // Update form with generated content (merge with existing)
      setFormData(prev => ({
        ...prev,
        title: generated.title || prev.title,
        summary: generated.summary || prev.summary,
        description: generated.description || prev.description,
        fundingGoal: generated.fundingGoalDollars || prev.fundingGoal,
        deployModes: generated.deployModes && generated.deployModes.length > 0 ? generated.deployModes : prev.deployModes,
        sectors: generated.sectors && generated.sectors.length > 0 ? generated.sectors : prev.sectors,
        repoUrl: repoUrl,
        // Add generated milestones and price tiers to existing ones
        milestones: [
          ...prev.milestones,
          ...(generated.milestones || []).map((m: any) => ({
            ...m,
            id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }))
        ],
        priceTiers: [
          ...prev.priceTiers,
          ...(generated.pledgeTiers || []).map((t: any) => ({
            ...t,
            amountDollars: t.amountDollars,
            benefits: Array.isArray(t.benefits) ? t.benefits : [],
            id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }))
        ]
      }));

      setSuccess('Campaign content generated successfully from repository!');
    } catch (error) {
      console.error('Generate content error:', error);
      throw error;
    }
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
            milestones: formData.milestones,
            stretchGoals: formData.stretchGoals,
          }),
        });

        if (response.ok) {
          setSuccess('Campaign updated successfully!');
          // Don't redirect after manual save - stay on edit page
          // setTimeout(() => {
          //   router.push(`/campaigns/${campaign.id}`);
          // }, 1500);
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
    { id: 'campaign', label: 'Campaign', icon: '📝' },
    { id: 'milestones', label: 'Milestones', icon: '🎯' },
    { id: 'price-tiers', label: 'Price Tiers', icon: '💰' },
    { id: 'stretch-goals', label: 'Stretch Goals', icon: '🚀' },
    { id: 'media', label: 'Media', icon: '🎬' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <form id="campaign-edit-form" onSubmit={handleSubmit} className="p-6">
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
      {activeTab === 'campaign' && (
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
                      onClick={() => handleInputChange('imageUrl', '')}
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
                  onClick={() => openMediaModal('image')}
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
                      onClick={() => handleInputChange('leadVideoUrl', '')}
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
                  onClick={() => openMediaModal('video')}
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
              onChange={(e) => handleInputChange('fundingGoal', Number(e.target.value))}
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
              Campaign Narrative
            </label>
            <div className="h-[75vh] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <TiptapEditor
                content={formData.description}
                onChange={(content) => handleInputChange('description', content)}
                placeholder="Write a detailed narrative of your campaign. Use the toolbar to format text, add links, images, and more..."
                maxLength={10000}
                className="h-full"
                onOpenMediaLibrary={() => openMediaModal('image', true)}
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
              onTitleUpdate={(newTitle) => handleInputChange('title', newTitle)}
              onSummaryUpdate={(newSummary) => handleInputChange('summary', newSummary)}
              onContentUpdate={(newContent) => handleInputChange('description', newContent)}
            />
          </div>

          {/* Deployment Options */}
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

          {/* Target Sectors */}
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

          {/* GitHub Repository Integration */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub Repository
              </label>
              <input
                type="url"
                value={formData.repoUrl || ''}
                onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://github.com/username/repository"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Link to your GitHub repository to enable automatic content generation and updates
              </p>
            </div>
            
            <div className="mt-4 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setGitHubModalOpen(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Generate from Repository</span>
              </button>
              
              {formData.repoUrl && (
                <button
                  type="button"
                  onClick={() => window.open(formData.repoUrl, '_blank')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>View Repository</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-8">
          {/* Media Management Header */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Media Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload, generate, and manage images and videos for your campaign
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => openMediaModal('image')}
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand transition-colors text-center"
            >
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-white">Add Images</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload or generate images</p>
            </button>
            
            <button
              type="button"
              onClick={() => openMediaModal('video')}
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand transition-colors text-center"
            >
              <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-white">Add Videos</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload or link videos</p>
            </button>

            <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-lg text-center bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center mx-auto mb-2">
                🎨
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white">AI Generator</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create custom images with AI</p>
            </div>
          </div>

          {/* Current Lead Media */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Lead Media</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Lead Image */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lead Image
                </label>
                {formData.imageUrl ? (
                  <div className="relative">
                    <img 
                      src={formData.imageUrl} 
                      alt="Current lead image" 
                      className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('imageUrl', '')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No lead image selected</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Lead Video */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lead Video
                </label>
                {formData.leadVideoUrl ? (
                  <div className="relative">
                    <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
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
                      onClick={() => handleInputChange('leadVideoUrl', '')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No lead video selected</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Image Library */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">📚 Media Library</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Browse, reuse, and manage your organization's media assets.
            </p>
            <ImageLibrary
              organizationId={(campaign as any).organizationId || undefined}
              onSelectImage={(imageUrl, imageId) => {
                handleInputChange('imageUrl', imageUrl);
              }}
              showGenerateButton={true}
              className="max-h-96 overflow-y-auto"
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
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900 dark:text-white">
                Current Milestones ({formData.milestones.length})
              </h5>
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(true)}
                className="px-3 py-1 bg-brand text-white text-sm rounded hover:bg-brand/90"
              >
                + Add Manual
              </button>
            </div>
            
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
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMilestone({ index, data: milestone });
                            setMilestoneModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
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
                    </div>
                    <div className="bg-white dark:bg-gray-700 rounded p-3">
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Acceptance Criteria:</h6>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {milestone.acceptance.checklist.map((item: string, i: number) => (
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

      {activeTab === 'price-tiers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">Price Tiers</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Define different pledge levels and rewards for your backers
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPriceTierModalOpen(true)}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              + Add Tier
            </button>
          </div>

          {/* Current Price Tiers */}
          <div className="space-y-4">
            {formData.priceTiers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No price tiers created yet. Add tiers to give backers different pledge options.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {formData.priceTiers.map((tier, index) => (
                  <div key={tier.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h6 className="font-medium text-gray-900 dark:text-white">{tier.title}</h6>
                          <span className="text-lg font-bold text-brand">${tier.amountDollars}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceTier({ index, data: tier });
                            setPriceTierModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePriceTier(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {tier.benefits && tier.benefits.length > 0 && (
                      <div className="bg-white dark:bg-gray-700 rounded p-3">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Benefits:</h6>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {tier.benefits.map((benefit: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Price Tier Tips</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Start with a basic tier at 25-50% of your average expected pledge</li>
              <li>• Offer compelling value at each tier level</li>
              <li>• Include early bird discounts to create urgency</li>
              <li>• Premium tiers should offer exclusive access or personalized service</li>
            </ul>
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
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900 dark:text-white">
                Current Stretch Goals ({formData.stretchGoals.length})
              </h5>
              <button
                type="button"
                onClick={() => setStretchGoalModalOpen(true)}
                className="px-3 py-1 bg-brand text-white text-sm rounded hover:bg-brand/90"
              >
                + Add Manual
              </button>
            </div>
            
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
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStretchGoal({ index, data: goal });
                            setStretchGoalModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
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



      {/* Media Selector Modal */}
      <MediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        organizationId={(campaign as any).organizationId || undefined}
        title={`Select ${mediaModalType === 'image' ? 'Lead Image' : 'Lead Video'}`}
        allowVideo={mediaModalType === 'video'}
        allowUpload={true}
      />

      {/* Milestone/Stretch Goal Modal */}
      <MilestoneStretchGoalModal
        isOpen={milestoneModalOpen}
        onClose={() => {
          setMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        type="milestone"
        onSubmit={handleMilestoneSubmit}
        editData={editingMilestone ? {
          name: editingMilestone.data.name,
          pct: editingMilestone.data.pct,
          checklistItems: editingMilestone.data.acceptance?.checklist || []
        } : null}
      />

      <MilestoneStretchGoalModal
        isOpen={stretchGoalModalOpen}
        onClose={() => {
          setStretchGoalModalOpen(false);
          setEditingStretchGoal(null);
        }}
        type="stretch-goal"
        fundingGoal={formData.fundingGoal}
        onSubmit={handleStretchGoalSubmit}
        editData={editingStretchGoal ? {
          title: editingStretchGoal.data.title,
          description: editingStretchGoal.data.description,
          targetDollars: editingStretchGoal.data.targetDollars
        } : null}
      />

      <PriceTierModal
        isOpen={priceTierModalOpen}
        onClose={() => {
          setPriceTierModalOpen(false);
          setEditingPriceTier(null);
        }}
        onSubmit={handlePriceTierSubmit}
        editData={editingPriceTier ? {
          title: editingPriceTier.data.title,
          description: editingPriceTier.data.description,
          amountDollars: editingPriceTier.data.amountDollars,
          benefits: editingPriceTier.data.benefits || []
        } : null}
      />

      <GitHubModal
        isOpen={gitHubModalOpen}
        onClose={() => setGitHubModalOpen(false)}
        currentRepoUrl={formData.repoUrl}
        onRepoUrlUpdate={handleRepoUrlUpdate}
        onGenerateContent={handleGenerateContent}
      />
    </form>
  );
}