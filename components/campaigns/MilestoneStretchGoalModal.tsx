'use client';

import { useState } from 'react';
import Modal from '@/app/components/shared/Modal';

export interface MilestoneFormData {
  name: string;
  pct: number;
  checklistItems: string[];
}

export interface StretchGoalFormData {
  title: string;
  description: string;
  targetDollars: number;
}

export interface PriceTierFormData {
  title: string;
  description: string;
  amountDollars: number;
  benefits: string[];
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'milestone';
  fundingGoal?: number;
  onSubmit: (data: MilestoneFormData) => void;
  editData?: MilestoneFormData | null;
}

interface StretchGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'stretch-goal';
  fundingGoal: number;
  onSubmit: (data: StretchGoalFormData) => void;
  editData?: StretchGoalFormData | null;
}

type MilestoneStretchGoalModalProps = MilestoneModalProps | StretchGoalModalProps;

export default function MilestoneStretchGoalModal({
  isOpen,
  onClose,
  type,
  fundingGoal = 0,
  onSubmit,
  editData
}: MilestoneStretchGoalModalProps) {
  const isMilestone = type === 'milestone';
  
  // Initialize form data based on type and edit data
  const [formData, setFormData] = useState(() => {
    if (isMilestone) {
      const milestoneData = editData as MilestoneFormData;
      return {
        name: milestoneData?.name || '',
        pct: milestoneData?.pct || 0,
        checklistItems: milestoneData?.checklistItems || [''],
        title: '',
        description: '',
        targetDollars: 0
      };
    } else {
      const stretchGoalData = editData as StretchGoalFormData;
      return {
        title: stretchGoalData?.title || '',
        description: stretchGoalData?.description || '',
        targetDollars: stretchGoalData?.targetDollars || fundingGoal * 2,
        name: '',
        pct: 0,
        checklistItems: ['']
      };
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (isMilestone) {
      if (!formData.name?.trim()) {
        newErrors.name = 'Milestone name is required';
      }
      if (typeof formData.pct === 'number' && (formData.pct < 0 || formData.pct > 100)) {
        newErrors.pct = 'Percentage must be between 0 and 100';
      }
      if (!formData.checklistItems?.some(item => item.trim())) {
        newErrors.checklistItems = 'At least one checklist item is required';
      }
    } else {
      if (!formData.title?.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.description?.trim()) {
        newErrors.description = 'Description is required';
      }
      if (typeof formData.targetDollars === 'number' && formData.targetDollars <= fundingGoal) {
        newErrors.targetDollars = `Target amount must be greater than funding goal ($${fundingGoal})`;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (isMilestone) {
        onSubmit({
          name: formData.name || '',
          pct: formData.pct || 0,
          checklistItems: (formData.checklistItems || []).filter(item => item.trim())
        } as MilestoneFormData);
      } else {
        onSubmit({
          title: formData.title || '',
          description: formData.description || '',
          targetDollars: formData.targetDollars || 0
        } as StretchGoalFormData);
      }
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData(isMilestone ? {
      name: '',
      pct: 0,
      checklistItems: [''],
      title: '',
      description: '',
      targetDollars: 0
    } : {
      title: '',
      description: '',
      targetDollars: fundingGoal * 2,
      name: '',
      pct: 0,
      checklistItems: ['']
    });
    setErrors({});
    onClose();
  };

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      checklistItems: [...prev.checklistItems, '']
    }));
  };

  const updateChecklistItem = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item, i) => i === index ? value : item)
    }));
  };

  const removeChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((_, i) => i !== index)
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isMilestone ? 'Add Milestone' : 'Add Stretch Goal'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isMilestone ? (
          <>
            {/* Milestone Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Milestone Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                  errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter milestone name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
            </div>

            {/* Completion Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completion Percentage *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.pct}
                onChange={(e) => setFormData(prev => ({ ...prev, pct: parseInt(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                  errors.pct ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="0-100"
              />
              {errors.pct && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pct}</p>}
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Acceptance Criteria *
              </label>
              <div className="space-y-2">
                {formData.checklistItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateChecklistItem(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter acceptance criteria"
                    />
                    {formData.checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="text-brand hover:text-brand/80 text-sm transition-colors"
                >
                  + Add another criteria
                </button>
              </div>
              {errors.checklistItems && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.checklistItems}</p>}
            </div>
          </>
        ) : (
          <>
            {/* Stretch Goal Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                  errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter stretch goal title"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                  errors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Describe what this stretch goal will deliver"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>}
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Amount ($) *
              </label>
              <input
                type="number"
                min={fundingGoal + 1}
                value={formData.targetDollars}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDollars: parseInt(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
                  errors.targetDollars ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder={`Amount greater than $${fundingGoal}`}
              />
              {errors.targetDollars && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetDollars}</p>}
            </div>
          </>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
          >
            {isMilestone ? 'Add Milestone' : 'Add Stretch Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}