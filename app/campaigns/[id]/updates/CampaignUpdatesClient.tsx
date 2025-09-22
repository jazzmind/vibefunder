'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/shared/Modal';
import { CommentSection } from '../comments';

interface Update {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  emailSent: boolean;
  createdAt: string | Date;
  authorId: string;
  author: {
    name?: string | null;
    email: string;
  };
  _count?: {
    comments: number;
  };
}

interface Campaign {
  id: string;
  title: string;
  updates: Update[];
  pledges: any[];
}

interface CampaignUpdatesClientProps {
  campaign: Campaign;
  canCreateUpdate: boolean;
  isOwner: boolean;
  isTeamMember: boolean;
  userId?: string;
  teamMemberIds?: string[];
}

export default function CampaignUpdatesClient({
  campaign,
  canCreateUpdate,
  isOwner,
  isTeamMember,
  userId,
  teamMemberIds = []
}: CampaignUpdatesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPublic: true,
    sendEmail: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUpdate = () => {
    setEditingUpdate(null);
    setFormData({
      title: '',
      content: '',
      isPublic: true,
      sendEmail: true
    });
    setIsModalOpen(true);
  };

  const handleEditUpdate = (update: Update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      content: update.content,
      isPublic: update.isPublic,
      sendEmail: false // Don't re-send emails when editing
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingUpdate 
        ? `/api/campaigns/${campaign.id}/updates/${editingUpdate.id}`
        : `/api/campaigns/${campaign.id}/updates`;
      
      const method = editingUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        window.location.reload(); // Refresh to show new update
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save update');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/updates/${updateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload(); // Refresh to show updated list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete update');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Campaign Updates
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {campaign.title}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href={`/campaigns/${campaign.id}`} className="btn-secondary">
                Back to Campaign
              </Link>
              {canCreateUpdate && (
                
                <button onClick={handleCreateUpdate} className="btn">
                Post Update
                </button>
            
              )}
            </div>
          </div>
        </div>

        {/* Updates Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-6h5v6z" />
            </svg>
            Updates ({campaign.updates.length})
          </h2>
          
          {campaign.updates.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No updates posted yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                {canCreateUpdate ? "Share your progress with backers!" : "Check back later for updates from the campaign team."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.updates.map((update: Update) => (
                <div key={update.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5 border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{update.title}</h3>
                        {update.isPublic ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                            Backers Only
                          </span>
                        )}
                        {update.emailSent && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                            ✉ Emailed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span>by {update.author.name || update.author.email.split('@')[0]}</span>
                        <span>•</span>
                        <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                        {update._count && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {update._count.comments} {update._count.comments === 1 ? 'comment' : 'comments'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {(isOwner || isTeamMember || update.authorId === userId) && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditUpdate(update)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit update"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(update.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete update"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none mb-6">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {update.content}
                    </p>
                  </div>
                  
                  {/* Comment section for this update */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                    <CommentSection
                      campaignId={campaign.id}
                      updateId={update.id}
                      itemType="update"
                      currentUser={userId ? {
                        userId,
                        email: '', // We don't have email here, but it's not used in the component
                        roles: [] // We don't have roles here, but permissions are handled differently
                      } : null}
                      canComment={canCreateUpdate} // Use same permission logic as updates
                      teamMemberIds={teamMemberIds}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post/Edit Update Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUpdate ? 'Edit Update' : 'Post Update'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Update Title
            </label>
            <input 
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Milestone 1 Complete!"
              required 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Update Content
            </label>
            <textarea 
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Share your progress, challenges, or exciting news with your backers..."
              rows={8}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Visibility & Notifications
            </label>
            <div className="space-y-3">
              <label className="flex items-start">
                <input 
                  type="checkbox" 
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Public Update</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Visible to everyone, not just backers
                  </p>
                </div>
              </label>
              {!editingUpdate && (
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={formData.sendEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendEmail: e.target.checked }))}
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Email Backers</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send email notification to all backers ({campaign.pledges.length} people)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editingUpdate ? 'Update' : 'Post Update')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
