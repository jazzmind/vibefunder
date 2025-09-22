'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Upload, Video, ImageIcon } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  filename: string;
  prompt?: string;
  thumbnail?: string;
  createdAt: Date;
}

interface MediaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaUrl: string, mediaType: 'image' | 'video', mediaId?: string) => void;
  organizationId?: string;
  title?: string;
  allowVideo?: boolean;
  allowUpload?: boolean;
}

export default function MediaSelectorModal({
  isOpen,
  onClose,
  onSelect,
  organizationId,
  title = "Select Media",
  allowVideo = true,
  allowUpload = true
}: MediaSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'generate'>('library');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  const loadLibraryImages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        offset: '0',
      });
      
      if (organizationId) params.append('organizationId', organizationId);

      const response = await fetch(`/api/images/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        const imageItems: MediaItem[] = data.images.map((img: any) => ({
          id: img.id,
          url: img.blobUrl,
          type: 'image' as const,
          filename: img.filename,
          prompt: img.prompt,
          createdAt: new Date(img.createdAt),
        }));
        setMediaItems(imageItems);
      }
    } catch (error) {
      console.error('Failed to load library images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && (!allowVideo || !isVideo)) {
      alert('Please select a valid image' + (allowVideo ? ' or video' : '') + ' file.');
      return;
    }

    try {
      setUploading(true);
      
      // TODO: Implement file upload to Vercel Blob
      // For now, create a temporary URL
      const tempUrl = URL.createObjectURL(file);
      
      const newMediaItem: MediaItem = {
        id: `temp-${Date.now()}`,
        url: tempUrl,
        type: isImage ? 'image' : 'video',
        filename: file.name,
        createdAt: new Date(),
      };

      setMediaItems(prev => [newMediaItem, ...prev]);
      
      // Select the uploaded file immediately
      onSelect(tempUrl, newMediaItem.type, newMediaItem.id);
      onClose();
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!generatePrompt.trim()) return;

    try {
      setGenerating(true);
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatePrompt,
          organizationId,
          isPublic: false,
        }),
      });

      if (response.ok) {
        const newImage = await response.json();
        const newMediaItem: MediaItem = {
          id: newImage.id,
          url: newImage.blobUrl,
          type: 'image',
          filename: newImage.filename,
          prompt: newImage.prompt,
          createdAt: new Date(newImage.createdAt),
        };

        setMediaItems(prev => [newMediaItem, ...prev]);
        
        // Select the generated image immediately
        onSelect(newImage.blobUrl, 'image', newImage.id);
        onClose();
        
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMediaSelect = (item: MediaItem) => {
    // Track usage for library images
    if (!item.id.startsWith('temp-')) {
      fetch(`/api/images/${item.id}/use`, { method: 'POST' }).catch(console.error);
    }
    
    onSelect(item.url, item.type, item.id);
    onClose();
  };

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadLibraryImages();
    }
  }, [isOpen, activeTab, organizationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Library
          </button>
          {allowUpload && (
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload
            </button>
          )}
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'generate'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🎨 Generate
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'library' && (
            <div className="p-6 h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleMediaSelect(item)}
                    >
                      <div className="aspect-square relative">
                        {item.type === 'image' ? (
                          <Image
                            src={item.url}
                            alt={item.prompt || item.filename}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-600">
                            <Video className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Select {item.type}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {item.prompt || item.filename}
                        </p>
                      </div>
                    </div>
                  ))}
                  {mediaItems.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                      No media found in library
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && allowUpload && (
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload Media
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Select an image{allowVideo ? ' or video' : ''} file to upload
                </p>
                <input
                  type="file"
                  accept={allowVideo ? 'image/*,video/*' : 'image/*'}
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="media-upload"
                />
                <label
                  htmlFor="media-upload"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                    uploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-brand hover:bg-brand/90 cursor-pointer'
                  } transition-colors`}
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="p-6">
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
                    rows={4}
                  />
                </div>
                <button
                  onClick={handleGenerateImage}
                  disabled={generating || !generatePrompt.trim()}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                      Generating Image...
                    </>
                  ) : (
                    '🎨 Generate Image'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}