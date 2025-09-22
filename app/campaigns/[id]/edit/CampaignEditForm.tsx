'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CampaignEditHeader from '@/components/campaign/CampaignEditHeader';
import CampaignEditSidebar from '@/components/campaign/CampaignEditSidebar';
import CampaignTab from '@/components/campaign/tabs/CampaignTab';
import AnalysisTab from '@/components/campaign/tabs/AnalysisTab';
import MediaTab from '@/components/campaign/tabs/MediaTab';
import MilestonesTab from '@/components/campaign/tabs/MilestonesTab';
import PriceTiersTab from '@/components/campaign/tabs/PriceTiersTab';
import SettingsTab from '@/components/campaign/tabs/SettingsTab';
import MediaSelectorModal from '@/components/shared/MediaSelectorModal';
import VideoUrlModal from '@/components/shared/VideoUrlModal';
import MilestoneStretchGoalModal, { MilestoneFormData, StretchGoalFormData } from '@/components/campaign/MilestoneStretchGoalModal';
import PriceTierModal, { PriceTierFormData } from '@/components/campaign/PriceTierModal';
import GitHubModal from '@/components/campaign/GitHubModal';
import Modal from '@/components/shared/Modal';
import { useCampaignForm } from '@/hooks/useCampaignForm';
import { Campaign } from '@prisma/client';

interface CampaignEditFormProps {
  campaign: Campaign & {
    analysis?: {
      masterPlan?: any;
      gapAnalysis?: any;
      featureScan?: any;
      competitorResearch?: any;
      sowMarkdown?: string;
      lastAnalyzedAt?: Date;
    } | null;
  };
  isAdmin: boolean;
}

export default function CampaignEditForm({ campaign, isAdmin }: CampaignEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('campaign');
  
  // Redirect from hidden tabs
  useEffect(() => {
    if ( activeTab === 'stretch-goals') {
      setActiveTab('campaign');
    }
  }, [activeTab]);

  // Refresh handler for milestone generation
  const handleRefresh = () => {
    // Refresh the page to get updated campaign data
    router.refresh();
  };
  
  // Form state using custom hook
  const {
    formData,
    errors,
    setErrors,
    autoSaving,
    lastSaved,
    autoSave,
    handleInputChange,
    handleArrayChange,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addPriceTier,
    updatePriceTier,
    deletePriceTier,
  } = useCampaignForm(campaign);

  const [success, setSuccess] = useState('');
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState<'image' | 'video'>('image');
  const [insertIntoEditor, setInsertIntoEditor] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  
  // Modal state
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [stretchGoalModalOpen, setStretchGoalModalOpen] = useState(false);
  const [priceTierModalOpen, setPriceTierModalOpen] = useState(false);
  const [gitHubModalOpen, setGitHubModalOpen] = useState(false);
  const [gitHubAppModalOpen, setGitHubAppModalOpen] = useState(false);
  const [githubConnection, setGithubConnection] = useState<{ connected: boolean; connection?: { username?: string | null } } | null>(null);
  const [githubAppConnected, setGithubAppConnected] = useState<boolean | null>(null);
  
  // Editing state
  const [editingMilestone, setEditingMilestone] = useState<{index: number, data: any} | null>(null);
  const [editingStretchGoal, setEditingStretchGoal] = useState<{index: number, data: any} | null>(null);
  const [editingPriceTier, setEditingPriceTier] = useState<{index: number, data: any} | null>(null);

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
    if (type === 'video') {
      setVideoModalOpen(true);
    } else {
    setMediaModalType(type);
    setInsertIntoEditor(forEditor);
    setMediaModalOpen(true);
    }
  };

  const handleVideoSelect = (videoUrl: string) => {
    handleInputChange('leadVideoUrl', videoUrl);
    setVideoModalOpen(false);
  };

  const handleSubmitForReview = async () => {
    if (!formData.imageUrl) return; // Ensure minimum requirements are met
    
    setIsSubmittingForReview(true);
    try {
      // First save the current form data
      await autoSave();
      
      // Then submit for review
      const response = await fetch(`/api/campaigns/${campaign.id}/submit-for-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setSuccess('Campaign submitted for admin review! You will be notified when the review is complete.');
        // Refresh the page to show updated review status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const data = await response.json();
        setErrors({ submit: data.error || 'Failed to submit campaign for review' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error occurred while submitting for review' });
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  // Fetch GitHub integration status
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [connRes, appRes] = await Promise.all([
          fetch('/api/github/connect', { cache: 'no-store' }).catch(() => null),
          fetch('/api/github/app/status', { cache: 'no-store' }).catch(() => null),
        ]);
        if (connRes?.ok) {
          const data = await connRes.json();
          setGithubConnection({ connected: !!data.connected, connection: data.connection });
        } else {
          setGithubConnection({ connected: false });
        }
        if (appRes?.ok) {
          const data = await appRes.json();
          setGithubAppConnected(!!data.connected);
        } else {
          setGithubAppConnected(false);
        }
      } catch (_e) {
        setGithubConnection({ connected: false });
        setGithubAppConnected(false);
      }
    };
    fetchStatuses();
  }, []);

  // Message handler for child components
  const handleShowMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setErrors({});
      // Auto-dismiss success messages after 2 seconds
      setTimeout(() => {
        setSuccess('');
      }, 2000);
        } else {
      setErrors({ submit: message });
      setSuccess('');
    }
  };

  // Modal handlers
  const handleMilestoneSubmit = (data: MilestoneFormData) => {
    if (editingMilestone) {
      updateMilestone(editingMilestone.index, {
        name: data.name,
        pct: data.pct,
        acceptance: { 
          checklist: data.checklistItems,
          sow: data.sow || ''
        }
      });
      setEditingMilestone(null);
    } else {
      addMilestone({
        name: data.name,
        pct: data.pct,
        acceptance: { 
          checklist: data.checklistItems,
          sow: data.sow || ''
        }
      });
    }
  };

  const handleStretchGoalSubmit = (data: StretchGoalFormData) => {
    // Note: Stretch goals functionality is currently disabled
    console.log('Stretch goal submitted:', data);
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
      if (generated.title) handleInputChange('title', generated.title);
      if (generated.summary) handleInputChange('summary', generated.summary);
      if (generated.description) handleInputChange('description', generated.description);
      if (generated.fundingGoalDollars) handleInputChange('fundingGoal', generated.fundingGoalDollars);
      if (generated.deployModes && generated.deployModes.length > 0) {
        handleInputChange('deployModes', generated.deployModes);
      }
      if (generated.sectors && generated.sectors.length > 0) {
        handleInputChange('sectors', generated.sectors);
      }
      handleInputChange('repoUrl', repoUrl);

        // Add generated milestones and price tiers to existing ones
      if (generated.milestones) {
        generated.milestones.forEach((m: any) => {
          addMilestone({
            ...m,
            id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
        });
      }
      
      if (generated.pledgeTiers) {
        generated.pledgeTiers.forEach((t: any) => {
          addPriceTier({
            ...t,
            amountDollars: t.amountDollars,
            benefits: Array.isArray(t.benefits) ? t.benefits : [],
            id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
        });
      }

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
            repoUrl: formData.repoUrl || null,
            websiteUrl: formData.websiteUrl || null,
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
    { id: 'campaign', label: 'Campaign' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'price-tiers', label: 'Price Tiers' },
    // { id: 'stretch-goals', label: 'Stretch Goals' },
    { id: 'media', label: 'Media' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="p-6">
      {/* Header with Tabs */}
      <CampaignEditHeader
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        campaignId={campaign.id}
        autoSaving={autoSaving}
        lastSaved={lastSaved}
      />

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Mobile Sidebar - shown at top on small screens */}
        <div className="lg:hidden mb-8">
          <CampaignEditSidebar
            campaign={campaign}
            formData={formData}
            githubConnection={githubConnection}
            githubAppConnected={githubAppConnected}
            isSubmittingForReview={isSubmittingForReview}
            onSubmitForReview={handleSubmitForReview}
            onSetGitHubModalOpen={setGitHubModalOpen}
            onSetGitHubAppModalOpen={setGitHubAppModalOpen}
          />
            </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <form id="campaign-edit-form" onSubmit={handleSubmit}>
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg relative">
          <div className="flex items-center justify-between">
                  <p className="text-green-600 dark:text-green-400 pr-8">{success}</p>
              <button
                    onClick={() => setSuccess('')}
                    className="absolute top-4 right-4 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
          </div>
        </div>
      )}

            {/* Error Message */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg relative">
          <div className="flex items-center justify-between">
                  <p className="text-red-600 dark:text-red-400 pr-8">{errors.submit}</p>
            <button
                    onClick={() => setErrors({})}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      </div>
                    )}

      {/* Tab Content */}
      {activeTab === 'campaign' && (
              <CampaignTab
                formData={formData}
                errors={errors}
                onInputChange={handleInputChange}
                onArrayChange={handleArrayChange}
                onOpenMediaModal={openMediaModal}
                onShowMessage={handleShowMessage}
              />
            )}

            {activeTab === 'analysis' && <AnalysisTab campaign={campaign} />}

      {activeTab === 'media' && (
              <MediaTab
                formData={formData}
                campaign={campaign}
                onInputChange={handleInputChange}
                onOpenMediaModal={openMediaModal}
              />
            )}

      {activeTab === 'milestones' && (
              <MilestonesTab
                formData={formData}
                campaignId={campaign.id}
                analysis={campaign.analysis}
                onAddMilestone={addMilestone}
                onEditMilestone={updateMilestone}
                onDeleteMilestone={deleteMilestone}
                onSetMilestoneModalOpen={setMilestoneModalOpen}
                onSetEditingMilestone={setEditingMilestone}
                onRefresh={handleRefresh}
              />
      )}

      {activeTab === 'price-tiers' && (
              <PriceTiersTab
                formData={formData}
                onDeletePriceTier={deletePriceTier}
                onSetPriceTierModalOpen={setPriceTierModalOpen}
                onSetEditingPriceTier={setEditingPriceTier}
              />
      )}

      {activeTab === 'settings' && (
              <SettingsTab
                formData={formData}
                campaign={campaign}
                onInputChange={handleInputChange}
              />
            )}
          </form>
          </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block">
          <CampaignEditSidebar
            campaign={campaign}
            formData={formData}
            githubConnection={githubConnection}
            githubAppConnected={githubAppConnected}
            isSubmittingForReview={isSubmittingForReview}
            onSubmitForReview={handleSubmitForReview}
            onSetGitHubModalOpen={setGitHubModalOpen}
            onSetGitHubAppModalOpen={setGitHubAppModalOpen}
                />
              </div>

      {/* Modals */}

      {/* Media Selector Modal - Images Only */}
      <MediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        organizationId={(campaign as any).organizationId || undefined}
        title="Select Lead Image"
        allowVideo={false}
        allowUpload={true}
      />

      {/* Video URL Modal */}
      <VideoUrlModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onSelect={handleVideoSelect}
        initialUrl={formData.leadVideoUrl}
        title="Add Lead Video"
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
          checklistItems: editingMilestone.data.checklistItems || editingMilestone.data.acceptance?.checklist || [],
          sow: editingMilestone.data.sow || editingMilestone.data.acceptance?.sow || ''
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

      {/* GitHub App Connect Modal */}
      <Modal
        isOpen={gitHubAppModalOpen}
        onClose={() => setGitHubAppModalOpen(false)}
        title={githubAppConnected ? 'Re-authenticate GitHub App' : 'Connect GitHub App'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This opens the GitHub App install page in a new tab. After installing and selecting repositories, click Done to refresh status.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`/api/github/app/start?state=${encodeURIComponent(`/campaigns/${campaign.id}/edit`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Open Install Flow
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  // Try to sync installation from GitHub App in case callback didn't run
                  await fetch('/api/github/app/sync', { method: 'POST' }).catch(() => null);
                  const [connRes, appRes] = await Promise.all([
                    fetch('/api/github/connect', { cache: 'no-store' }).catch(() => null),
                    fetch('/api/github/app/status', { cache: 'no-store' }).catch(() => null),
                  ]);
                  if (connRes?.ok) {
                    const data = await connRes.json();
                    setGithubConnection({ connected: !!data.connected, connection: data.connection });
                  }
                  if (appRes?.ok) {
                    const data = await appRes.json();
                    setGithubAppConnected(!!data.connected || !!data.installed);
                  }
                } catch {}
                setGitHubAppModalOpen(false);
              }}
              className="px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </div>
  );
}
