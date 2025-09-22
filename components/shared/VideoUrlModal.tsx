'use client';

import { useState, useEffect } from 'react';
import { X, Video, ExternalLink } from 'lucide-react';

interface VideoUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (videoUrl: string) => void;
  initialUrl?: string;
  title?: string;
}

interface VideoInfo {
  url: string;
  embedUrl: string;
  thumbnailUrl: string;
  title: string;
  platform: 'youtube' | 'vimeo';
}

export default function VideoUrlModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  initialUrl = '',
  title = 'Add Video URL' 
}: VideoUrlModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      if (initialUrl) {
        validateAndPreview(initialUrl);
      } else {
        setVideoInfo(null);
        setError('');
      }
    }
  }, [isOpen, initialUrl]);

  const extractVideoId = (url: string): { platform: 'youtube' | 'vimeo' | null; id: string | null } => {
    // YouTube patterns
    const youtubeRegexes = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const regex of youtubeRegexes) {
      const match = url.match(regex);
      if (match) {
        return { platform: 'youtube', id: match[1] };
      }
    }

    // Vimeo patterns
    const vimeoRegexes = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const regex of vimeoRegexes) {
      const match = url.match(regex);
      if (match) {
        return { platform: 'vimeo', id: match[1] };
      }
    }

    return { platform: null, id: null };
  };

  const validateAndPreview = async (inputUrl: string) => {
    if (!inputUrl.trim()) {
      setVideoInfo(null);
      setError('');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const { platform, id } = extractVideoId(inputUrl);

      if (!platform || !id) {
        setError('Please enter a valid YouTube or Vimeo URL');
        setVideoInfo(null);
        setIsValidating(false);
        return;
      }

      let embedUrl: string;
      let thumbnailUrl: string;
      let videoTitle = 'Video Preview';

      if (platform === 'youtube') {
        embedUrl = `https://www.youtube.com/embed/${id}`;
        thumbnailUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        
        // Try to get video title from YouTube API (if available)
        try {
          const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
          if (response.ok) {
            const data = await response.json();
            videoTitle = data.title || videoTitle;
          }
        } catch {
          // Fallback to default title if API fails
        }
      } else {
        embedUrl = `https://player.vimeo.com/video/${id}`;
        thumbnailUrl = ''; // Vimeo thumbnails require API key
        
        // Try to get video title from Vimeo API
        try {
          const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`);
          if (response.ok) {
            const data = await response.json();
            videoTitle = data.title || videoTitle;
            thumbnailUrl = data.thumbnail_url || '';
          }
        } catch {
          // Fallback to default title if API fails
        }
      }

      setVideoInfo({
        url: inputUrl,
        embedUrl,
        thumbnailUrl,
        title: videoTitle,
        platform
      });
    } catch (err) {
      setError('Failed to validate video URL');
      setVideoInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateAndPreview(newUrl);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = () => {
    if (videoInfo) {
      onSelect(videoInfo.url);
      onClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setVideoInfo(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Video URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Supported platforms: YouTube and Vimeo
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isValidating && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Validating video...</span>
            </div>
          )}

          {/* Video Preview */}
          {videoInfo && !isValidating && (
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                {videoInfo.thumbnailUrl ? (
                  <div className="relative">
                    <img
                      src={videoInfo.thumbnailUrl}
                      alt={videoInfo.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[12px] border-l-gray-800 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{videoInfo.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="capitalize">{videoInfo.platform}</span>
                    <span>•</span>
                    <a
                      href={videoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-brand transition-colors"
                    >
                      View on {videoInfo.platform === 'youtube' ? 'YouTube' : 'Vimeo'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!videoInfo || isValidating}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Video
          </button>
        </div>
      </div>
    </div>
  );
}
