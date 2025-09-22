'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  content: string;
  createdAt: Date | string;
  isTeamMember?: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  campaignId: string;
  comments?: Comment[]; // Make optional since we'll fetch from API
  currentUser: { userId: string; email: string; roles: string[] } | null;
  canComment: boolean;
  teamMemberIds: string[];
  // New props for linking to specific items
  updateId?: string;
  itemType?: string;
  itemId?: string;
  // Optional prop to hide the form (for read-only displays)
  readOnly?: boolean;
}

export function CommentSection({ 
  campaignId, 
  comments: initialComments, 
  currentUser, 
  canComment, 
  teamMemberIds,
  updateId,
  itemType = 'campaign',
  itemId,
  readOnly = false
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch comments from API if not provided or when filters change
  useEffect(() => {
    if (!initialComments) {
      fetchComments();
    }
  }, [updateId, itemType, itemId]);

  const fetchComments = async () => {
    try {
      const params = new URLSearchParams();
      if (updateId) params.append('updateId', updateId);
      if (itemType && itemType !== 'campaign') params.append('itemType', itemType);
      if (itemId) params.append('itemId', itemId);

      const response = await fetch(`/api/campaigns/${campaignId}/comments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          updateId,
          itemType,
          itemId
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to post comment');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyContent.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          parentId,
          updateId,
          itemType,
          itemId
        }),
      });

      if (response.ok) {
        const reply = await response.json();
        setComments(prev => prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [...(comment.replies || []), reply] }
            : comment
        ));
        setReplyContent('');
        setReplyTo(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to post reply');
      }
    } catch (error) {
      alert('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setComments(prev => prev.map(comment => 
          comment.id === commentId ? updatedComment : {
            ...comment,
            replies: comment.replies?.map(reply => 
              reply.id === commentId ? updatedComment : reply
            )
          }
        ));
        setEditingId(null);
        setEditContent('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to edit comment');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => {
          if (comment.id === commentId) return false;
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply => reply.id !== commentId);
          }
          return true;
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete comment');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Discussion ({comments.length})
      </h3>

      {/* Add Comment Form */}
      {!readOnly && currentUser ? (
        canComment ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add a comment
              </label>
              <textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={updateId ? "Share your thoughts about this update..." : "Share your thoughts about this campaign..."}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="btn"
              disabled={!newComment.trim() || isLoading}
            >
              {isLoading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Only backers can comment on this campaign. Back this campaign to join the discussion!
            </p>
          </div>
        )
      ) : (
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <a href="/signin" className="font-medium underline">Sign in</a> to join the conversation and support this campaign.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              {/* Main Comment */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-semibold">
                    {(comment.user.name || comment.user.email).charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {comment.user.name || comment.user.email.split('@')[0]}
                      </span>
                      {(comment.isTeamMember || teamMemberIds.includes(comment.user.id)) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-brand/10 text-brand rounded-full">
                          Campaign Team
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(comment.createdAt as Date)}
                      </span>
                    </div>
                    
                    {/* Edit/Delete buttons */}
                    {currentUser && (comment.user.id === currentUser.userId || currentUser.roles.includes('admin') || teamMemberIds.includes(currentUser.userId)) && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          title="Edit comment"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          title="Delete comment"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          className="px-3 py-1 text-sm bg-brand text-white rounded hover:bg-brand-dark"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                  
                  {canComment && !readOnly && (
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-sm text-brand hover:text-brand-dark font-medium"
                    >
                      Reply
                    </button>
                  )}

                  {/* Reply Form */}
                  {replyTo === comment.id && (
                    <form
                      onSubmit={(e) => handleSubmitReply(e, comment.id)}
                      className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows={2}
                        required
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
                          disabled={!replyContent.trim()}
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyContent('');
                          }}
                          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-14 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
                          {(reply.user.name || reply.user.email).charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {reply.user.name || reply.user.email.split('@')[0]}
                          </span>
                          {teamMemberIds.includes(reply.user.id) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold bg-brand/10 text-brand rounded-full">
                              Team
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(reply.createdAt as Date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}