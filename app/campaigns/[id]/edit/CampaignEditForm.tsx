'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, ImageIcon, Video } from 'lucide-react';
import ImageGenerator from '@/components/campaign/ImageGenerator';
import AIContentEnhancer from '@/components/campaign/AIContentEnhancer';
import AIMilestoneSuggestions from '@/components/campaign/AIMilestoneSuggestions';
import AIStretchGoalSuggestions from '@/components/campaign/AIStretchGoalSuggestions';
import TiptapEditor from '@/components/editor/TiptapEditor';
import ImageLibrary from '@/components/images/ImageLibrary';
import MediaSelectorModal from '@/components/shared/MediaSelectorModal';
import MilestoneStretchGoalModal, { MilestoneFormData, StretchGoalFormData } from '@/components/campaign/MilestoneStretchGoalModal';
import PriceTierModal, { PriceTierFormData } from '@/components/campaign/PriceTierModal';
import GitHubModal from '@/components/campaign/GitHubModal';
import Modal from '@/components/shared/Modal';
import { markdownToHtml } from '@/lib/markdownToHtml';

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
  websiteUrl?: string | null;
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
    websiteUrl: (campaign as any).websiteUrl || '',
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
  const [gitHubAppModalOpen, setGitHubAppModalOpen] = useState(false);
  const [githubConnection, setGithubConnection] = useState<{ connected: boolean; connection?: { username?: string | null } } | null>(null);
  const [githubAppConnected, setGithubAppConnected] = useState<boolean | null>(null);
  const [featureScan, setFeatureScan] = useState<any>(null);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureError, setFeatureError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [selectedScanners, setSelectedScanners] = useState<Record<string, boolean>>({});
  const [loadingCaps, setLoadingCaps] = useState(false);
  const [sowMarkdown, setSowMarkdown] = useState<string | null>(null);
  const [research, setResearch] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [storedAnalysis, setStoredAnalysis] = useState<any>(null);
  const [loadingStored, setLoadingStored] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [masterPlanState, setMasterPlanState] = useState<any>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  const [gapJobId, setGapJobId] = useState<string | null>(null);
  const [gapStatus, setGapStatus] = useState<any>(null);
  const [gapResult, setGapResult] = useState<any>(null);
  const gapTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Fetch GitHub integration status (PAT connection) and GitHub App installation status
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

  // Load analyzer capabilities and stored analysis
  useEffect(() => {
    // Load capabilities and stored analysis in parallel
    const loadCapabilities = async () => {
      try {
        setLoadingCaps(true);
        const res = await fetch('/api/analyzer/capabilities');
        const data = await res.json();
        if (res.ok) {
          setCapabilities(data);
          const defaults: Record<string, boolean> = {};
          (data.scanners || []).forEach((s: any) => {
            defaults[s.name] = !!s.available;
          });
          setSelectedScanners(defaults);
        }
      } catch (e: any) {
        // ignore
      } finally {
        setLoadingCaps(false);
      }
    };

    const loadStoredAnalysis = async () => {
      try {
        setLoadingStored(true);
        console.log('Loading stored analysis for campaign:', campaign.id);
        const res = await fetch(`/api/campaigns/${campaign.id}/analysis`);
        console.log('Analysis response status:', res.status);
        
        if (res.ok) {
          const analysis = await res.json();
          console.log('Loaded analysis:', analysis);
          setStoredAnalysis(analysis);
          // Pre-populate data from stored analysis
          if (analysis.masterPlan) {
            console.log('Setting master plan from stored analysis');
            setMasterPlanState(analysis.masterPlan);
          }
          if (analysis.gapAnalysis) {
            console.log('Setting gap analysis from stored analysis');
            setGapResult(analysis.gapAnalysis);
          }
          if (analysis.featureScan) {
            console.log('Setting feature scan from stored analysis');
            setFeatureScan(analysis.featureScan);
          }
          if (analysis.sowMarkdown) {
            console.log('Setting SOW from stored analysis');
            setSowMarkdown(analysis.sowMarkdown);
          }
          if (analysis.competitorResearch) {
            console.log('Setting competitor research from stored analysis');
            setResearch(analysis.competitorResearch);
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.log('Analysis API error:', errorData);
        }
      } catch (e: any) {
        console.error('Failed to load stored analysis:', e);
      } finally {
        setLoadingStored(false);
      }
    };

    // Run both loading operations in parallel
    Promise.all([loadCapabilities(), loadStoredAnalysis()]);
  }, [campaign.id]);

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
          websiteUrl: formData.websiteUrl || null,
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

  const handleGenerateFromWebsite = async (websiteUrl: string, userPrompt?: string) => {
    try {
      const response = await fetch('/api/services/generate-from-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: websiteUrl, userPrompt, autoCreate: false })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate from website');
      }
      const result = await response.json();
      const generated = result.generated;
      setFormData(prev => ({
        ...prev,
        title: generated.name || prev.title,
        summary: prev.summary || (generated.valueProposition || generated.description || '').slice(0, 200),
        description: generated.description || prev.description,
        websiteUrl: websiteUrl
      }));
      setSuccess('Campaign content updated from website');
    } catch (error) {
      console.error('Generate from website error:', error);
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
    { id: 'campaign', label: 'Campaign', icon: '📝' },
    { id: 'analysis', label: 'Gap Analysis', icon: '🔍' },
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
        {/* GitHub Integration Status & Actions */}
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-sm flex flex-wrap items-center gap-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">GitHub</span>
              <span className={`px-2 py-1 rounded-full text-xs ${githubConnection?.connected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                {githubConnection?.connected
                  ? `Connected${githubConnection?.connection?.username ? ` as ${githubConnection.connection.username}` : ''}`
                  : 'Not connected'}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">App</span>
              <span className={`px-2 py-1 rounded-full text-xs ${githubAppConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                {githubAppConnected ? 'Installed' : 'Needs auth'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGitHubAppModalOpen(true)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {githubAppConnected ? 'Re-auth GitHub App' : 'Connect GitHub App'}
              </button>
              <button
                type="button"
                onClick={() => setGitHubModalOpen(true)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Set Repository
              </button>
            </div>
          </div>
        </div>
        <nav className="flex space-x-8 overflow-x-auto">
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

          {/* Project Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Website
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
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
              repoUrl={formData.repoUrl}
              websiteUrl={formData.websiteUrl}
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

          {/* Removed GitHub repo field (handled via GitHub connection). Website field moved above. */}

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
            <a
              href={formData.repoUrl ? `/analyzer?repo=${encodeURIComponent(formData.repoUrl)}&auto=1` : '#'}
              className={`px-3 py-2 bg-gray-900 text-white rounded-lg transition-colors ${formData.repoUrl ? 'hover:bg-gray-800' : 'opacity-50 pointer-events-none'}`}
            >
              Run Gap Analysis
            </a>
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
                        {Array.isArray(milestone.acceptance?.checklist) && milestone.acceptance.checklist.length > 0 ? (
                          milestone.acceptance.checklist.map((item: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              {item}
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-500 dark:text-gray-300">No criteria listed</li>
                        )}
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
      {activeTab === 'analysis' && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Analysis Hub
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Plan, analyze, and generate milestones from automated scans and AI insights
              </p>
            </div>
   
          </div>

          {/* Stored Analysis Section */}
          {loadingStored && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">Loading stored analysis...</span>
              </div>
            </div>
          )}
          
          {storedAnalysis && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">📊 Previous Analysis Available</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Analysis last updated: {new Date(storedAnalysis.lastAnalyzedAt).toLocaleDateString()} at {new Date(storedAnalysis.lastAnalyzedAt).toLocaleTimeString()}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {storedAnalysis.masterPlan && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded">Master Plan ✓</span>
                )}
                {storedAnalysis.gapAnalysis && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded">Gap Analysis ✓</span>
                )}
                {storedAnalysis.featureScan && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded">Feature Scan ✓</span>
                )}
                {storedAnalysis.sowMarkdown && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded">SOW ✓</span>
                )}
              </div>
            </div>
          )}

          {/* Master Plan Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Master Plan Generation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate a comprehensive product plan from campaign data and repository documentation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setResearchError(null);
                    setResearchLoading(true);
                    try {
                      const res = await fetch('/api/analyzer/research', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ 
                          description: `${formData.title}: ${formData.summary}`, 
                          website_url: formData.websiteUrl || undefined,
                          campaign_id: campaign.id
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) setResearch(data);
                    } catch (e: any) {
                      setResearchError(e?.message || 'research_failed');
                    } finally {
                      setResearchLoading(false);
                    }
                  }}
                  disabled={!formData.title || researchLoading}
                  className={`px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {researchLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Research...</span>
                    </div>
                  ) : 'Competitor Research'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.title || !formData.summary) return;
                    setPlanError(null);
                    setPlanLoading(true);
                    setMasterPlanState(null);
                    try {
                      const res = await fetch('/api/analyzer/master-plan', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          repo_url: formData.repoUrl,
                          website_url: formData.websiteUrl || undefined,
                          campaign: { title: formData.title, summary: formData.summary, description: formData.description },
                          campaign_id: campaign.id,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error || 'master_plan_failed');
                      setMasterPlanState(data);
                    } catch (e: any) {
                      setPlanError(e?.message || 'master_plan_failed');
                    } finally {
                      setPlanLoading(false);
                    }
                  }}
                  disabled={!formData.title || planLoading}
                  className={`px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {planLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (masterPlanState ? 'Regenerate Master Plan' : 'Generate Master Plan')}
                </button>
              </div>
            </div>

            {planError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{planError}</p>
              </div>
            )}

            {researchError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{researchError}</p>
              </div>
            )}

            {masterPlanState && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Must-have Features</h5>
                  <ul className="space-y-1">
                    {(masterPlanState.mustHaveFeatures || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-green-500 mr-2 mt-0.5">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {(masterPlanState.niceToHaveFeatures || []).length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Nice-to-have Features</h5>
                    <ul className="space-y-1">
                      {masterPlanState.niceToHaveFeatures.map((f: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-blue-500 mr-2 mt-0.5">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Competitor Research Section - Display after master plan */}
            {(research && research.content) || researchError ? (
              <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-4">Competitor Research</h5>
                
                {researchError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{researchError}</p>
                  </div>
                )}
                
                {research && research.content && (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ 
                      __html: markdownToHtml(research.content) 
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* Scanner Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Scanner Configuration</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select which security and quality scanners to run on your repository
              </p>
            </div>
            
            {loadingCaps ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading scanner capabilities...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(capabilities?.scanners || [
                  { name: 'semgrep', available: true, description: 'Static analysis for security vulnerabilities' },
                  { name: 'gitleaks', available: true, description: 'Scan for hardcoded secrets and credentials' },
                  { name: 'sbom', available: true, description: 'Software bill of materials and vulnerability scan' },
                ]).map((scanner: any) => (
                  <label key={scanner.name} className={`flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${!scanner.available ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={!scanner.available}
                      checked={!!selectedScanners[scanner.name]}
                      onChange={(e) => setSelectedScanners((prev) => ({ ...prev, [scanner.name]: e.target.checked }))}
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{scanner.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {scanner.description || `${scanner.name} security scanner`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Gap Analysis Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Security & Quality Analysis</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Run automated scanners and generate actionable milestones from findings
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!formData.repoUrl) return;
                  setGapError(null);
                  setGapLoading(true);
                  setGapResult(null);
                  setGapStatus(null);
                  try {
                    const scanners = Object.entries(selectedScanners)
                      .filter(([, v]) => v)
                      .map(([k]) => k);
                    const startRes = await fetch('/api/analyzer/start', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ repo_url: formData.repoUrl, scanners }),
                    });
                    const startData = await startRes.json();
                    if (!startRes.ok) throw new Error(startData.error || 'start_failed');
                    const jid = startData.job_id || startData.jobId;
                    setGapJobId(jid);
                    if (gapTimerRef.current) clearInterval(gapTimerRef.current);
                    gapTimerRef.current = setInterval(async () => {
                      try {
                        const st = await fetch(`/api/analyzer/jobs/${jid}`);
                        const sd = await st.json();
                        setGapStatus(sd);
                        
                        // Check if we have reports available and can run gap analysis (auto-trigger)
                        if (sd.reports_present && sd.reports_present.length > 0 && !gapResult) {
                          try {
                            const gapRes = await fetch('/api/analyzer/gap', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ job_id: jid, repo_url: formData.repoUrl, campaign_id: campaign.id }),
                            });
                            const gapData = await gapRes.json();
                            if (gapRes.ok) setGapResult(gapData);
                          } catch (gapError) {
                            console.error('Auto gap analysis failed:', gapError);
                          }
                        }
                        
                        if (sd.status === 'succeeded') {
                          if (gapTimerRef.current) clearInterval(gapTimerRef.current);
                          
                          // Run gap analysis if not already done
                          if (!gapResult) {
                            const gapRes = await fetch('/api/analyzer/gap', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ job_id: jid, repo_url: formData.repoUrl, campaign_id: campaign.id }),
                            });
                            const gapData = await gapRes.json();
                            if (!gapRes.ok) throw new Error(gapData?.error || 'gap_failed');
                            setGapResult(gapData);
                          }
                          
                          // Fetch SOW with campaign ID for storage
                          try {
                            const sowRes = await fetch(`/api/analyzer/jobs/${jid}/sow?campaign_id=${campaign.id}`);
                            const sowData = await sowRes.json();
                            if (sowRes.ok && sowData.sow_markdown) {
                              setSowMarkdown(sowData.sow_markdown);
                            }
                          } catch (sowError) {
                            console.error('Failed to fetch/store SOW:', sowError);
                          }
                          
                          setGapLoading(false);
                        } else if (sd.status === 'failed') {
                          if (gapTimerRef.current) clearInterval(gapTimerRef.current);
                          setGapLoading(false);
                          setGapError(sd?.message || 'analysis_failed');
                        }
                      } catch (e: any) {
                        if (gapTimerRef.current) clearInterval(gapTimerRef.current);
                        setGapLoading(false);
                        setGapError(e?.message || 'poll_failed');
                      }
                    }, 1500) as unknown as NodeJS.Timeout;
                  } catch (e: any) {
                    setGapLoading(false);
                    setGapError(e?.message || 'start_failed');
                  }
                }}
                disabled={!formData.repoUrl || gapLoading}
                className={`px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {gapLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Running Analysis...</span>
                  </div>
                ) : (gapResult ? 'Re-run Gap Analysis' : 'Run Gap Analysis')}
              </button>
            </div>

            {gapError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{gapError}</p>
              </div>
            )}

            {gapStatus && (
              <div className="mb-4 space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Analysis Progress</h5>
                {Array.isArray(gapStatus.steps) && gapStatus.steps.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        s.status === 'succeeded' ? 'bg-green-500' : 
                        s.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        s.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{s.name}</span>
                      {s.message && <span className="text-sm text-gray-500">{s.message}</span>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      s.status === 'succeeded' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      s.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      s.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {gapResult && (
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900 dark:text-white">Recommended Milestones</h5>
                <div className="grid gap-4">
                  {(gapResult.milestones || []).map((m: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <h6 className="font-semibold text-gray-900 dark:text-white mb-2">{m.title}</h6>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{m.description}</p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Acceptance Criteria</div>
                          <ul className="text-sm space-y-1">
                            {(m.acceptance || []).map((a: string, j: number) => (
                              <li key={j} className="flex items-start text-gray-600 dark:text-gray-400">
                                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Scope of Work</div>
                          <ul className="text-sm space-y-1">
                            {(m.scope || []).map((s: string, j: number) => (
                              <li key={j} className="flex items-start text-gray-600 dark:text-gray-400">
                                <span className="text-blue-500 mr-2 mt-0.5">→</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feature Presence Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Feature Presence Scan</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check which planned features are already implemented in the codebase
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!formData.repoUrl) return;
                  setFeatureError(null);
                  setFeatureLoading(true);
                  try {
                    const plan = masterPlanState;
                    const base: string[] = Array.isArray(plan?.mustHaveFeatures)
                      ? plan.mustHaveFeatures
                      : (formData.milestones || []).map((m: any) => m.name);
                    const features = base.slice(0, 12).map((f: string) => ({
                      name: f,
                      keywords: f.split(/[^a-zA-Z0-9]+/).filter((t: string) => t.length > 3).map((t: string) => t.toLowerCase()),
                    }));
                    const res = await fetch('/api/analyzer/features', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ repo_url: formData.repoUrl, features, campaign_id: campaign.id }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'features_failed');
                    setFeatureScan(data);
                  } catch (e: any) {
                    setFeatureError(e?.message || 'features_failed');
                  } finally {
                    setFeatureLoading(false);
                  }
                }}
                disabled={!formData.repoUrl || featureLoading}
                className={`px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {featureLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scanning...</span>
                  </div>
                ) : (featureScan ? 'Re-scan Features' : 'Scan Features')}
              </button>
            </div>

            {featureError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{featureError}</p>
              </div>
            )}

            {featureScan && (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Feature</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Keyword Hits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Files Matched</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Robust Signals</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {(featureScan.results || []).map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.feature}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            r.present 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {r.present ? 'Present' : 'Missing'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.keyword_hits}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.files_matched}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.robust_signals_hits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>



          {/* SOW Section */}
          {sowMarkdown && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Statement of Work (Draft)</h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: markdownToHtml(sowMarkdown) 
                  }}
                />
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Analysis Tips</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Generate a master plan first to get comprehensive feature lists</li>
              <li>• Run gap analysis to identify security and quality issues</li>
              <li>• Use feature scanning to validate implementation progress</li>
              <li>• Results help create realistic milestones and acceptance criteria</li>
              <li>• Competitor research displays after master plan with formatted insights and tables</li>
              <li>• SOW documents display with full markdown formatting including tables and lists</li>
            </ul>
          </div>
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
    </form>
  );
}