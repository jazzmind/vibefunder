'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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
  repoUrl?: string | null;
  websiteUrl?: string | null;
  milestones?: any[];
  stretchGoals?: any[];
  pledgeTiers?: any[];
}

interface FormData {
  title: string;
  summary: string;
  description: string;
  fundingGoal: number;
  imageUrl: string;
  leadVideoUrl: string;
  deployModes: string[];
  sectors: string[];
  requireBackerAccount: boolean;
  onlyBackersComment: boolean;
  repoUrl: string;
  websiteUrl: string;
  milestones: any[];
  stretchGoals: any[];
  priceTiers: any[];
}

export function useCampaignForm(campaign: Campaign) {
  const [formData, setFormData] = useState<FormData>({
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Autosave
  const formDataRef = useRef(formData);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleArrayChange = useCallback((field: 'deployModes' | 'sectors', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  }, []);

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

  // Milestone management
  const addMilestone = useCallback((milestone: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { ...milestone, id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }]
    }));
  }, []);

  const updateMilestone = useCallback((index: number, milestone: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) => i === index ? milestone : m)
    }));
  }, []);

  const deleteMilestone = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  }, []);

  // Price tier management
  const addPriceTier = useCallback((tier: any) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: [...prev.priceTiers, { 
        ...tier, 
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order: prev.priceTiers.length + 1
      }]
    }));
  }, []);

  const updatePriceTier = useCallback((index: number, tier: any) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.map((t, i) => i === index ? tier : t)
    }));
  }, []);

  const deletePriceTier = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.filter((_, i) => i !== index)
    }));
  }, []);

  return {
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
  };
}
