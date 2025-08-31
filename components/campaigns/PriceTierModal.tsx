'use client';

import { useState } from 'react';
import Modal from '@/components/shared/Modal';

export interface PriceTierFormData {
  title: string;
  description: string;
  amountDollars: number;
  benefits: string[];
}

interface PriceTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PriceTierFormData) => void;
  editData?: PriceTierFormData | null;
}

export default function PriceTierModal({
  isOpen,
  onClose,
  onSubmit,
  editData
}: PriceTierModalProps) {
  const [formData, setFormData] = useState(() => ({
    title: editData?.title || '',
    description: editData?.description || '',
    amountDollars: editData?.amountDollars || 0,
    benefits: editData?.benefits || ['']
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.amountDollars <= 0) {
      newErrors.amountDollars = 'Amount must be greater than 0';
    }
    if (!formData.benefits.some(benefit => benefit.trim())) {
      newErrors.benefits = 'At least one benefit is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit({
        title: formData.title,
        description: formData.description,
        amountDollars: formData.amountDollars,
        benefits: formData.benefits.filter(benefit => benefit.trim())
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      amountDollars: 0,
      benefits: ['']
    });
    setErrors({});
    onClose();
  };

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => i === index ? value : benefit)
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Price Tier"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tier Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
              errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="e.g., Early Bird, Premium Access, VIP"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pledge Amount ($) *
          </label>
          <input
            type="number"
            min="1"
            value={formData.amountDollars}
            onChange={(e) => setFormData(prev => ({ ...prev, amountDollars: parseInt(e.target.value) || 0 }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none ${
              errors.amountDollars ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="Amount in dollars"
          />
          {errors.amountDollars && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amountDollars}</p>}
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
            placeholder="Describe what backers get at this tier level"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>}
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benefits & Rewards *
          </label>
          <div className="space-y-2">
            {formData.benefits.map((benefit, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={benefit}
                  onChange={(e) => updateBenefit(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter a benefit (e.g., Early access, Exclusive content)"
                />
                {formData.benefits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBenefit}
              className="text-brand hover:text-brand/80 text-sm transition-colors"
            >
              + Add another benefit
            </button>
          </div>
          {errors.benefits && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.benefits}</p>}
        </div>

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
            Add Price Tier
          </button>
        </div>
      </form>
    </Modal>
  );
}