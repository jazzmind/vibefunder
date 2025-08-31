'use client';

import { useEffect } from 'react';

export function useAutoImageGeneration(campaignId: string | null, shouldGenerate: boolean = true) {
  useEffect(() => {
    if (!campaignId || !shouldGenerate) return;

    const generateImage = async () => {
      try {
        const response = await fetch('/api/campaigns/auto-generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campaignId }),
        });

        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Auto-generated campaign image:', data.imagePath);
        } else if (data.hasImage) {
          console.log('ℹ️ Campaign already has an image');
        } else {
          console.log('⚠️ Image generation skipped:', data.message);
        }
      } catch (error) {
        console.warn('Auto image generation failed:', error);
        // Don't throw error for auto-generation failures
      }
    };

    // Add a small delay to ensure campaign is fully created
    const timer = setTimeout(generateImage, 2000);
    
    return () => clearTimeout(timer);
  }, [campaignId, shouldGenerate]);
}

export default useAutoImageGeneration;