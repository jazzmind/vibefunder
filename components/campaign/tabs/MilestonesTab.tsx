'use client';

import { useState } from 'react';
import AIMilestoneSuggestions from '@/components/campaign/AIMilestoneSuggestions';

interface Milestone {
  id?: string;
  name: string;
  pct: number;
  acceptance: {
    checklist: string[];
    sow?: string;
  };
}

interface FormData {
  title: string;
  summary: string;
  description: string;
  fundingGoal: number;
  repoUrl: string;
  milestones: Milestone[];
}

interface AnalysisData {
  masterPlan?: {
    roadmapMilestones?: Array<{
      title: string;
      description: string;
      acceptance: string[];
    }>;
  };
  sowMarkdown?: string;
}

interface MilestonesTabProps {
  formData: FormData;
  campaignId: string;
  analysis?: AnalysisData | null;
  onAddMilestone: (milestone: any) => void;
  onEditMilestone: (index: number, data: any) => void;
  onDeleteMilestone: (index: number) => void;
  onSetMilestoneModalOpen: (open: boolean) => void;
  onSetEditingMilestone: (data: {index: number, data: any} | null) => void;
  onRefresh?: () => void;
}

export default function MilestonesTab({
  formData,
  campaignId,
  analysis,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onSetMilestoneModalOpen,
  onSetEditingMilestone,
  onRefresh
}: MilestonesTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, index: number} | null>(null);

  const roadmapMilestones = analysis?.masterPlan?.roadmapMilestones || [];
  const hasRoadmapMilestones = roadmapMilestones.length > 0;

  const handleGenerateMilestones = async () => {
    if (!hasRoadmapMilestones) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate milestones');
      }

      const result = await response.json();
      
      // Add the new milestones to the form data immediately
      if (result.milestones && Array.isArray(result.milestones)) {
        result.milestones.forEach((milestone: any) => {
          onAddMilestone({
            id: milestone.id,
            name: milestone.name,
            pct: milestone.pct,
            acceptance: milestone.acceptance
          });
        });
      }
      
      // Also refresh the campaign data
      if (onRefresh) {
        onRefresh();
      }
      
      // Show success message (could add toast here)
      console.log(`Generated ${result.milestones.length} milestones from analysis`);
      
    } catch (error) {
      console.error('Error generating milestones:', error);
      // Could add error toast here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteClick = (index: number) => {
    setDeleteConfirm({ show: true, index });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDeleteMilestone(deleteConfirm.index);
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleEditClick = (index: number, milestone: Milestone) => {
    // Pre-populate the editing data with SOW support
    const editData = {
      name: milestone.name,
      pct: milestone.pct,
      checklistItems: milestone.acceptance?.checklist || [],
      sow: milestone.acceptance?.sow || ''
    };
    onSetEditingMilestone({ index, data: editData });
    onSetMilestoneModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">Campaign Milestones</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define key checkpoints for your campaign development
          </p>
        </div>
        <button
          onClick={handleGenerateMilestones}
          disabled={!hasRoadmapMilestones || isGenerating}
          className={`px-3 py-2 bg-brand text-white rounded-lg transition-colors ${
            hasRoadmapMilestones && !isGenerating 
              ? 'hover:bg-brand/90' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate from Analysis'}
        </button>
      </div>

      {/* Available Roadmap Milestones from Analysis */}
      {hasRoadmapMilestones && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-blue-900 dark:text-blue-100">
              Roadmap Milestones from Analysis ({roadmapMilestones.length})
            </h5>
            <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
              Ready to Generate
            </span>
          </div>
          <div className="space-y-2">
            {roadmapMilestones.map((milestone, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded p-3 border border-blue-200 dark:border-blue-700">
                <h6 className="font-medium text-gray-900 dark:text-white text-sm">{milestone.title}</h6>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                {milestone.acceptance && milestone.acceptance.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Acceptance Criteria:</span>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                      {milestone.acceptance.slice(0, 3).map((criteria, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-1">•</span>
                          {criteria}
                        </li>
                      ))}
                      {milestone.acceptance.length > 3 && (
                        <li className="text-gray-500 dark:text-gray-400">
                          +{milestone.acceptance.length - 3} more criteria
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
            Click "Generate from Analysis" to convert these into campaign milestones{analysis?.sowMarkdown ? ' with SOW details' : ''}.
          </p>
        </div>
      )}

      {/* Current Milestones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-gray-900 dark:text-white">
            Current Milestones ({formData.milestones.length})
          </h5>
          <button
            type="button"
            onClick={() => onSetMilestoneModalOpen(true)}
            className="px-3 py-1 bg-brand text-white text-sm rounded hover:bg-brand/90"
          >
            + Add Manual
          </button>
        </div>
        
        {formData.milestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No milestones created yet. Use AI suggestions or add manually.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.milestones.map((milestone, index) => (
              <div key={milestone.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-900 dark:text-white">{milestone.name}</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{milestone.pct}% completion</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(index, milestone)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit milestone"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete milestone"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded p-3 space-y-3">
                  <div>
                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Acceptance Criteria:</h6>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {Array.isArray(milestone.acceptance?.checklist) && milestone.acceptance.checklist.length > 0 ? (
                        milestone.acceptance.checklist.map((item: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 dark:text-gray-300">No criteria listed</li>
                      )}
                    </ul>
                  </div>
                  
                  {milestone.acceptance?.sow && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Statement of Work:</h6>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded p-2 font-mono text-xs">
                        {milestone.acceptance.sow}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.show && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this milestone? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
