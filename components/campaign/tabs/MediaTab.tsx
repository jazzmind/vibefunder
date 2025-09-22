'use client';

import { X, ImageIcon, Video } from 'lucide-react';
import ImageLibrary from '@/components/images/ImageLibrary';
import { Campaign } from '@prisma/client';

interface FormData {
  imageUrl: string;
  leadVideoUrl: string;
}


interface MediaTabProps {
  formData: FormData;
  campaign: Campaign;
  onInputChange: (field: string, value: any) => void;
  onOpenMediaModal: (type: 'image' | 'video') => void;
}

export default function MediaTab({
  formData,
  campaign,
  onInputChange,
  onOpenMediaModal
}: MediaTabProps) {
  return (
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
          onClick={() => onOpenMediaModal('image')}
          className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand transition-colors text-center"
        >
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h4 className="font-medium text-gray-900 dark:text-white">Add Images</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload or generate images</p>
        </button>
        
        <button
          type="button"
          onClick={() => onOpenMediaModal('video')}
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
                  onClick={() => onInputChange('imageUrl', '')}
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
                  onClick={() => onInputChange('leadVideoUrl', '')}
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
            onInputChange('imageUrl', imageUrl);
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
  );
}
