'use client';

import { useState } from 'react';

interface StretchGoalSuggestion {
  id: string;
  title: string;
  description: string;
  targetDollars: number;
  reason: string;
  selected: boolean;
}

interface AIStretchGoalSuggestionsProps {
  title: string;
  summary: string;
  description: string;
  fundingGoal: number;
  onStretchGoalsGenerated: (stretchGoals: Omit<StretchGoalSuggestion, 'id' | 'selected'>[]) => void;
}

export default function AIStretchGoalSuggestions({
  title,
  summary,
  description,
  fundingGoal,
  onStretchGoalsGenerated
}: AIStretchGoalSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<StretchGoalSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/suggest-stretch-goals', {
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
        const suggestedGoals = data.stretchGoals || [];
        setSuggestions(suggestedGoals.map((s: any, index: number) => ({
          ...s,
          id: `stretch-suggestion-${index}`,
          selected: false,
        })));
      }
    } catch (error) {
      console.error('Failed to generate stretch goal suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s)
    );
  };

  const addSelectedStretchGoals = () => {
    const selectedGoals = suggestions
      .filter(s => s.selected)
      .map(({ id, selected, ...goal }) => goal);
    
    onStretchGoalsGenerated(selectedGoals);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">🚀 AI Stretch Goal Suggestions</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate stretch goal ideas to exceed your funding target
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
              <span>Generate Ideas</span>
            </>
          )}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-900 dark:text-white">
              Suggested Stretch Goals ({suggestions.length})
            </h5>
            {suggestions.some(s => s.selected) && (
              <button
                type="button"
                onClick={addSelectedStretchGoals}
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
                      <h6 className="font-medium text-gray-900 dark:text-white">{suggestion.title}</h6>
                      <p className="text-sm text-brand font-medium">${suggestion.targetDollars.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {suggestion.description}
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Why this works:</strong> {suggestion.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Add campaign description content to generate AI stretch goal suggestions.</p>
        </div>
      )}
    </div>
  );
}