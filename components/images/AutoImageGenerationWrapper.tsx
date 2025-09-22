'use client';

import useAutoImageGeneration from '@/hooks/useAutoImageGeneration';

interface AutoImageGenerationWrapperProps {
  campaignId: string;
  hasImage: boolean;
  isOwner: boolean;
}

export default function AutoImageGenerationWrapper({ 
  campaignId, 
  hasImage, 
  isOwner 
}: AutoImageGenerationWrapperProps) {
  // Only auto-generate if:
  // 1. User is the owner
  // 2. Campaign doesn't have an image
  // 3. URL has 'new=true' parameter (indicating newly created campaign)
  const isNewCampaign = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('new') === 'true'
    : false;
  
  useAutoImageGeneration(
    campaignId, 
    isOwner && !hasImage && isNewCampaign
  );

  return null; // This is just a logic component
}