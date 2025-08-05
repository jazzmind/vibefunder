'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrganizationPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    email: '',
    businessType: 'company',
    taxId: '',
    type: 'creator',
    shortDescription: '',
    listingVisibility: 'public',
    services: [] as string[],
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Load service categories
  useEffect(() => {
    const loadServiceCategories = async () => {
      try {
        const response = await fetch('/api/services/categories');
        if (response.ok) {
          const data = await response.json();
          setServiceCategories(data);
        }
      } catch (error) {
        console.error('Failed to load service categories:', error);
      }
    };

    if (formData.type === 'service_provider') {
      loadServiceCategories();
    }
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard?message=organization-submitted');
      } else {
        setError(data.error || 'Failed to submit organization');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Organization
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Submit your organization for approval to start creating campaigns on VibeFunder.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Type *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="type"
                        value="creator"
                        checked={formData.type === 'creator'}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900 dark:text-white">Creator Organization</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Create and manage campaigns</div>
                      </div>
                    </label>
                    <label className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio"
                        name="type"
                        value="service_provider"
                        checked={formData.type === 'service_provider'}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900 dark:text-white">Service Provider</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Offer services to creators</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                {formData.type === 'service_provider' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Short Description *
                    </label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                      placeholder="Brief tagline for marketplace listings"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required={formData.type === 'service_provider'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                    <option value="non_profit">Non-Profit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Optional for individuals"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tell us about your organization"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Service Provider specific fields */}
              {formData.type === 'service_provider' && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Service Provider Details
                  </h3>
                  
                  {/* Service Categories */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Service Categories *
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select the services you offer. You can modify these later.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {serviceCategories.map((category) => (
                        <label key={category.id} className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.services.includes(category.id)}
                            onChange={(e) => {
                              const services = e.target.checked
                                ? [...formData.services, category.id]
                                : formData.services.filter(id => id !== category.id);
                              handleArrayInputChange('services', services);
                            }}
                            className="w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand focus:ring-2"
                          />
                          <div className="ml-3">
                            <div className="flex items-center space-x-2">
                              <span>{category.icon}</span>
                              <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Listing Visibility */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Listing Visibility
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="radio"
                          name="listingVisibility"
                          value="public"
                          checked={formData.listingVisibility === 'public'}
                          onChange={(e) => handleInputChange('listingVisibility', e.target.value)}
                          className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2 mt-0.5"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 dark:text-white">Public</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Visible to everyone, including non-registered users</div>
                        </div>
                      </label>
                      <label className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="radio"
                          name="listingVisibility"
                          value="creators_only"
                          checked={formData.listingVisibility === 'creators_only'}
                          onChange={(e) => handleInputChange('listingVisibility', e.target.value)}
                          className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2 mt-0.5"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 dark:text-white">Creators Only</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Only visible to registered creator organizations</div>
                        </div>
                      </label>
                      <label className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="radio"
                          name="listingVisibility"
                          value="limited"
                          checked={formData.listingVisibility === 'limited'}
                          onChange={(e) => handleInputChange('listingVisibility', e.target.value)}
                          className="w-4 h-4 text-brand border-gray-300 focus:ring-brand focus:ring-2 mt-0.5"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 dark:text-white">Limited Public</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Basic info public, detailed info requires registration</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Review Process
                      </h3>
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        Your organization will be reviewed by our team. You'll receive an email notification once approved. 
                        This process typically takes 1-3 business days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn"
                >
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}