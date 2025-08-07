'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GeneratedImage {
  id: string;
  blobUrl: string;
  filename: string;
  prompt: string;
  theme?: string;
  tags: string[];
  width?: number;
  height?: number;
  createdAt: Date;
}

interface ImageLibraryProps {
  organizationId?: string;
  onSelectImage?: (imageUrl: string, imageId: string) => void;
  showGenerateButton?: boolean;
  className?: string;
}

export default function ImageLibrary({
  organizationId,
  onSelectImage,
  showGenerateButton = true,
  className = ''
}: ImageLibraryProps) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTheme, setSearchTheme] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const themes = [
    'ai', 'healthcare', 'finance', 'education', 'retail', 'security', 'technology', 'general'
  ];

  const loadImages = async (reset = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        offset: reset ? '0' : offset.toString(),
      });

      if (organizationId) params.append('organizationId', organizationId);
      if (searchTheme) params.append('theme', searchTheme);
      if (searchTags) params.append('tags', searchTags);

      const response = await fetch(`/api/images/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (reset) {
          setImages(data.images);
          setOffset(20);
        } else {
          setImages(prev => [...prev, ...data.images]);
          setOffset(prev => prev + 20);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!generatePrompt.trim()) return;

    try {
      setGenerating(true);
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt,
          organizationId,
          tags: searchTags.split(',').filter(Boolean),
          isPublic: false,
        }),
      });

      if (response.ok) {
        const newImage = await response.json();
        setImages(prev => [newImage, ...prev]);
        setGeneratePrompt('');
        setShowGenerator(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageSelect = async (image: GeneratedImage) => {
    if (onSelectImage) {
      // Track usage
      try {
        await fetch(`/api/images/${image.id}/use`, { method: 'POST' });
      } catch (error) {
        console.error('Failed to track image usage:', error);
      }
      
      onSelectImage(image.blobUrl, image.id);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    loadImages(true);
  };

  useEffect(() => {
    loadImages(true);
  }, [organizationId]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Image Library
        </h3>
        {showGenerateButton && (
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
          >
            {showGenerator ? 'Cancel' : '🎨 Generate New'}
          </button>
        )}
      </div>

      {/* Image Generator */}
      {showGenerator && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describe the image you want to generate
              </label>
              <textarea
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="e.g., A modern tech startup office with people collaborating on laptops, vibrant colors, professional atmosphere..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={generateImage}
                disabled={generating || !generatePrompt.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                    Generating...
                  </>
                ) : (
                  'Generate Image'
                )}
              </button>
              <button
                onClick={() => setShowGenerator(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Theme
          </label>
          <select
            value={searchTheme}
            onChange={(e) => setSearchTheme(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Themes</option>
            {themes.map(theme => (
              <option key={theme} value={theme}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            placeholder="e.g., modern, dashboard, ai"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Image Grid */}
      {loading && images.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleImageSelect(image)}
              >
                <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={image.blobUrl}
                    alt={image.prompt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    unoptimized={true}
                    onError={(e) => {
                      console.error('Image failed to load:', image.blobUrl, e);
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.display = 'none';
                      // Show fallback
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex items-center justify-center h-full bg-gray-200 dark:bg-gray-600">
                            <div class="text-center">
                              <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <p class="text-xs text-gray-500">Failed to load</p>
                            </div>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', image.blobUrl);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Select Image
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {image.prompt}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {image.theme && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {image.theme}
                      </span>
                    )}
                    {image.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {tag}
                      </span>
                    ))}
                    {image.tags.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        +{image.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => loadImages(false)}
                disabled={loading}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {images.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No images found. {showGenerateButton && 'Generate your first AI image to get started!'}
            </div>
          )}
        </>
      )}
    </div>
  );
}