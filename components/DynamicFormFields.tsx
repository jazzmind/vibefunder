'use client';

import { useState } from 'react';

interface DynamicFormFieldsProps {
  fieldName: string;
  label: string;
  placeholder: string;
  initialValues?: string[];
  className?: string;
}

export default function DynamicFormFields({ 
  fieldName, 
  label, 
  placeholder, 
  initialValues = [''], 
  className = '' 
}: DynamicFormFieldsProps) {
  const [fields, setFields] = useState<string[]>(
    initialValues.length > 0 ? initialValues : ['']
  );

  const addField = () => {
    setFields([...fields, '']);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const updateField = (index: number, value: string) => {
    const newFields = [...fields];
    newFields[index] = value;
    setFields(newFields);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              name={`${fieldName}-${index}`}
              type="text"
              value={field}
              onChange={(e) => updateField(index, e.target.value)}
              placeholder={index === 0 ? placeholder : `Another ${fieldName.slice(0, -1)} (optional)`}
              className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${className}`}
            />
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => removeField(index)}
                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                aria-label="Remove field"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addField}
        className="mt-2 text-brand hover:text-brand-dark text-sm font-medium flex items-center space-x-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Add another {fieldName.slice(0, -1)}</span>
      </button>
    </div>
  );
}
