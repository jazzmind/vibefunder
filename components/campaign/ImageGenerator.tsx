'use client';

import { useState } from 'react';

interface ImageGeneratorProps {
  campaignId: string;
  currentImage?: string | null;
  onImageGenerated?: (imagePath: string) => void;
}

export default function ImageGenerator({ 
  campaignId, 
  currentImage, 
  onImageGenerated 
}: ImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(currentImage || null);

  const generateImage = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImage(data.imagePath);
      onImageGenerated?.(data.imagePath);
      setSuccess('✅ Image generated successfully! Refreshing page...');
      
      // Show success message and reload to see the new image
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        🎨 AI-Generated Campaign Image
      </h3>
      
      {/* Current/Generated Image Preview */}
      {generatedImage && (
        <div className="mb-4">
          <div className="aspect-video w-full max-w-md overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
            <img 
              src={generatedImage} 
              alt="Campaign image" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Generation Controls */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {currentImage 
            ? "Generate a new AI image for your campaign or keep the current one."
            : "Generate an AI-powered image that represents your campaign based on your title and description."
          }
        </p>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              ❌ {error}
            </p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              {success}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={generateImage}
            disabled={isGenerating}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${isGenerating 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-brand hover:bg-brand-dark text-white hover:shadow-lg'
              }
            `}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </div>
            ) : (
              <>
                {currentImage ? '🔄 Regenerate Image' : '✨ Generate Image'}
              </>
            )}
          </button>

          {currentImage && !isGenerating && (
            <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 self-center">
              Current image will be replaced
            </p>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Images are generated using AI based on your campaign content</p>
          <p>• High-quality 1024x1024 images optimized for your campaign</p>
          <p>• Generation typically takes 10-30 seconds</p>
        </div>
      </div>
    </div>
  );
}