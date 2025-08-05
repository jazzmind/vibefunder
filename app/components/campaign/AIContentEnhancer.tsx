'use client';

import { useState } from 'react';
import { diffWords } from 'diff';

interface Enhancement {
  id: string;
  type: 'addition' | 'modification' | 'restructure';
  section: string;
  originalText: string;
  enhancedText: string;
  reason: string;
  approved: boolean | null; // null = pending, true = approved, false = rejected
}

interface AIContentEnhancerProps {
  content: string;
  title: string;
  summary: string;
  onContentUpdate: (newContent: string) => void;
}

export default function AIContentEnhancer({ 
  content, 
  title, 
  summary,
  onContentUpdate 
}: AIContentEnhancerProps) {
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const analyzeContent = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.suggestions || [];
        setEnhancements(suggestions.map((s: any, index: number) => ({
          ...s,
          id: `enhancement-${index}`,
          approved: null,
        })));
      }
    } catch (error) {
      console.error('Failed to analyze content:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApproval = (id: string, approved: boolean) => {
    setEnhancements(prev =>
      prev.map(e => e.id === id ? { ...e, approved } : e)
    );
  };

  const applyApprovedChanges = () => {
    const approvedEnhancements = enhancements.filter(e => e.approved === true);
    let updatedContent = content;

    // Sort by position in text to apply changes correctly (from end to beginning)
    const sortedEnhancements = approvedEnhancements.sort((a, b) => {
      const posA = content.indexOf(a.originalText);
      const posB = content.indexOf(b.originalText);
      return posB - posA; // Reverse order
    });

    // Apply each enhancement
    sortedEnhancements.forEach(enhancement => {
      const index = updatedContent.indexOf(enhancement.originalText);
      if (index !== -1) {
        updatedContent = 
          updatedContent.substring(0, index) + 
          enhancement.enhancedText + 
          updatedContent.substring(index + enhancement.originalText.length);
      }
    });

    onContentUpdate(updatedContent);
    setEnhancements([]);
    setShowPreview(false);
  };

  const generatePreview = () => {
    const approvedEnhancements = enhancements.filter(e => e.approved === true);
    let previewContent = content;

    approvedEnhancements.reverse().forEach(enhancement => {
      previewContent = previewContent.replace(
        enhancement.originalText,
        enhancement.enhancedText
      );
    });

    return previewContent;
  };

  const DiffView = ({ original, enhanced }: { original: string; enhanced: string }) => {
    const diff = diffWords(original, enhanced);
    
    return (
      <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded border">
        {diff.map((part, index) => (
          <span
            key={index}
            className={
              part.added
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : part.removed
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 line-through'
                : 'text-gray-700 dark:text-gray-300'
            }
          >
            {part.value}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">🤖 AI Content Enhancer</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Get AI-powered suggestions to improve your campaign description
          </p>
        </div>
        <button
          type="button"
          onClick={analyzeContent}
          disabled={isAnalyzing || !content.trim()}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Enhance Content</span>
            </>
          )}
        </button>
      </div>

      {enhancements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Enhancement Suggestions ({enhancements.length})
            </h5>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-brand hover:underline"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              {enhancements.some(e => e.approved === true) && (
                <button
                  type="button"
                  onClick={applyApprovedChanges}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Apply Changes ({enhancements.filter(e => e.approved === true).length})
                </button>
              )}
            </div>
          </div>

          {showPreview && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h6 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Preview with Approved Changes</h6>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {generatePreview()}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {enhancements.map((enhancement) => (
              <div
                key={enhancement.id}
                className={`border rounded-lg p-4 ${
                  enhancement.approved === true
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : enhancement.approved === false
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      enhancement.type === 'addition'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : enhancement.type === 'modification'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                    }`}>
                      {enhancement.type.charAt(0).toUpperCase() + enhancement.type.slice(1)}
                    </span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {enhancement.section}
                    </span>
                  </div>
                  
                  {enhancement.approved === null && (
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleApproval(enhancement.id, false)}
                        className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(enhancement.id, true)}
                        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  <strong>Reason:</strong> {enhancement.reason}
                </p>

                <DiffView
                  original={enhancement.originalText}
                  enhanced={enhancement.enhancedText}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {enhancements.length === 0 && !isAnalyzing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Click "Enhance Content" to get AI-powered suggestions for improving your campaign description.</p>
        </div>
      )}
    </div>
  );
}