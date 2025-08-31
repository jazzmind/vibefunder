'use client';

import { useState } from 'react';

interface MilestoneSuggestion {
  id: string;
  name: string;
  pct: number;
  acceptance: {
    checklist: string[];
  };
  reason: string;
  selected: boolean;
}

interface AIMilestoneSuggestionsProps {
  title: string;
  summary: string;
  description: string;
  fundingGoal: number;
  onMilestonesGenerated: (milestones: Omit<MilestoneSuggestion, 'id' | 'selected'>[]) => void;
}

export default function AIMilestoneSuggestions({
  title,
  summary,
  description,
  fundingGoal,
  onMilestonesGenerated
}: AIMilestoneSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<MilestoneSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/suggest-milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          description,
          fundingGoal,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const suggestedMilestones = data.milestones || [];
        setSuggestions(suggestedMilestones.map((s: any, index: number) => ({
          ...s,
          id: `suggestion-${index}`,
          selected: false,
        })));
      }
    } catch (error) {
      console.error('Failed to generate milestone suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s)
    );
  };

  const addSelectedMilestones = () => {
    const selectedMilestones = suggestions
      .filter(s => s.selected)
      .map(({ id, selected, ...milestone }) => milestone);
    
    onMilestonesGenerated(selectedMilestones);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">🤖 AI Milestone Suggestions</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate milestone suggestions based on your campaign content
          </p>
        </div>
        <button
          type="button"
          onClick={generateSuggestions}
          disabled={isGenerating || !description.trim()}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Generate Suggestions</span>
            </>
          )}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Suggested Milestones ({suggestions.length})
            </h5>
            {suggestions.some(s => s.selected) && (
              <button
                type="button"
                onClick={addSelectedMilestones}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Add Selected ({suggestions.filter(s => s.selected).length})
              </button>
            )}
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  suggestion.selected
                    ? 'border-brand bg-brand/5'
                    : 'border-gray-200 dark:border-gray-600 hover:border-brand/50'
                }`}
                onClick={() => toggleSelection(suggestion.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={suggestion.selected}
                      onChange={() => toggleSelection(suggestion.id)}
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                    />
                    <div>
                      <h6 className="font-medium text-gray-900 dark:text-white">{suggestion.name}</h6>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion.pct}% completion</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  <strong>Rationale:</strong> {suggestion.reason}
                </p>

                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                  <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Acceptance Criteria:</h6>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {suggestion.acceptance.checklist.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Add campaign description content to generate AI milestone suggestions.</p>
        </div>
      )}
    </div>
  );
}