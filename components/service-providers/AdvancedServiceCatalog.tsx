'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

// Service Package Schema
const ServicePackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Package name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  pricing: z.object({
    type: z.enum(['fixed', 'hourly', 'milestone', 'custom']),
    basePrice: z.number().min(0, 'Price must be positive'),
    currency: z.string().default('USD'),
    tiers: z.array(z.object({
      name: z.string(),
      price: z.number(),
      features: z.array(z.string()),
      estimatedTime: z.string(),
      isPopular: z.boolean().default(false)
    })).default([])
  }),
  deliverables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    timeline: z.string()
  })),
  addOns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    price: z.number(),
    estimatedTime: z.string()
  })).default([]),
  prerequisites: z.array(z.string()).default([]),
  estimatedDuration: z.string(),
  revisions: z.number().default(2),
  supportIncluded: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false)
});

type ServicePackage = z.infer<typeof ServicePackageSchema>;

interface AdvancedServiceCatalogProps {
  organizationId: string;
  existingServices?: any[];
  onServiceUpdate?: (services: ServicePackage[]) => void;
}

export default function AdvancedServiceCatalog({ 
  organizationId, 
  existingServices = [], 
  onServiceUpdate 
}: AdvancedServiceCatalogProps) {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<ServicePackage | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load service categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/services/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Initialize with existing services
  useEffect(() => {
    if (existingServices.length > 0) {
      const transformedServices = existingServices.map(service => ({
        id: service.id,
        name: service.title || service.category?.name || '',
        description: service.description || '',
        categoryId: service.categoryId,
        pricing: {
          type: 'fixed' as const,
          basePrice: 0,
          currency: 'USD',
          tiers: []
        },
        deliverables: [],
        addOns: [],
        prerequisites: [],
        estimatedDuration: service.estimatedTime || '',
        revisions: 2,
        supportIncluded: true,
        isActive: service.isActive,
        isFeatured: service.isFeatured
      }));
      setServices(transformedServices);
    }
  }, [existingServices]);

  const createNewService = () => {
    const newService: ServicePackage = {
      name: '',
      description: '',
      categoryId: '',
      pricing: {
        type: 'fixed',
        basePrice: 0,
        currency: 'USD',
        tiers: []
      },
      deliverables: [],
      addOns: [],
      prerequisites: [],
      estimatedDuration: '',
      revisions: 2,
      supportIncluded: true,
      isActive: true,
      isFeatured: false
    };
    setEditingService(newService);
    setShowEditor(true);
  };

  const editService = (service: ServicePackage) => {
    setEditingService({ ...service });
    setShowEditor(true);
  };

  const saveService = async () => {
    if (!editingService) return;

    try {
      ServicePackageSchema.parse(editingService);
      setLoading(true);
      setError('');

      // If it's a new service (no id), add to list
      if (!editingService.id) {
        const newId = `service_${Date.now()}`;
        const newService = { ...editingService, id: newId };
        const updatedServices = [...services, newService];
        setServices(updatedServices);
        onServiceUpdate?.(updatedServices);
      } else {
        // Update existing service
        const updatedServices = services.map(s => 
          s.id === editingService.id ? editingService : s
        );
        setServices(updatedServices);
        onServiceUpdate?.(updatedServices);
      }

      setShowEditor(false);
      setEditingService(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        setError('Failed to save service');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteService = (serviceId: string) => {
    const updatedServices = services.filter(s => s.id !== serviceId);
    setServices(updatedServices);
    onServiceUpdate?.(updatedServices);
  };

  const duplicateService = (service: ServicePackage) => {
    const duplicated = {
      ...service,
      id: `service_${Date.now()}`,
      name: `${service.name} (Copy)`,
      isFeatured: false
    };
    const updatedServices = [...services, duplicated];
    setServices(updatedServices);
    onServiceUpdate?.(updatedServices);
  };

  if (showEditor && editingService) {
    return (
      <ServiceEditor
        service={editingService}
        categories={categories}
        onUpdate={setEditingService}
        onSave={saveService}
        onCancel={() => {
          setShowEditor(false);
          setEditingService(null);
          setError('');
        }}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Service Catalog
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your service packages, pricing tiers, and add-ons
          </p>
        </div>
        <button
          onClick={createNewService}
          className="btn"
        >
          + Create Service Package
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-6xl mb-4 block">📦</span>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No Service Packages Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first service package with custom pricing tiers, deliverables, and add-ons to attract clients.
          </p>
          <button
            onClick={createNewService}
            className="btn"
          >
            Create Your First Service Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              categories={categories}
              onEdit={editService}
              onDelete={deleteService}
              onDuplicate={duplicateService}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ServiceCardProps {
  service: ServicePackage;
  categories: any[];
  onEdit: (service: ServicePackage) => void;
  onDelete: (serviceId: string) => void;
  onDuplicate: (service: ServicePackage) => void;
}

function ServiceCard({ service, categories, onEdit, onDelete, onDuplicate }: ServiceCardProps) {
  const category = categories.find((c: any) => c.id === service.categoryId);
  const basePrice = service.pricing.tiers.length > 0 
    ? Math.min(...service.pricing.tiers.map(t => t.price))
    : service.pricing.basePrice;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{category?.icon || '📦'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {service.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {category?.name || 'Uncategorized'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {service.isFeatured && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              ⭐ Featured
            </span>
          )}
          {!service.isActive && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              Inactive
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-3">
        {service.description}
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Starting at:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${basePrice.toLocaleString()} {service.pricing.currency}
          </span>
        </div>

        {service.pricing.tiers.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {service.pricing.tiers.length} pricing tier{service.pricing.tiers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Deliverables:</span>
          <span className="text-gray-900 dark:text-white">
            {service.deliverables.length}
          </span>
        </div>

        {service.addOns.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Add-ons:</span>
            <span className="text-gray-900 dark:text-white">
              {service.addOns.length}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
          <span className="text-gray-900 dark:text-white">
            {service.estimatedDuration || 'Not specified'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onEdit(service)}
          className="btn-secondary flex-1 text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDuplicate(service)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Duplicate"
        >
          📋
        </button>
        <button
          onClick={() => service.id && onDelete(service.id)}
          className="p-2 text-gray-400 hover:text-red-500"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

interface ServiceEditorProps {
  service: ServicePackage;
  categories: any[];
  onUpdate: (service: ServicePackage) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}

function ServiceEditor({ service, categories, onUpdate, onSave, onCancel, loading, error }: ServiceEditorProps) {
  const [activeTab, setActiveTab] = useState('basic');

  const updateService = (updates: Partial<ServicePackage>) => {
    onUpdate({ ...service, ...updates });
  };

  const addPricingTier = () => {
    const newTier = {
      name: '',
      price: 0,
      features: [''],
      estimatedTime: '',
      isPopular: false
    };
    updateService({
      pricing: {
        ...service.pricing,
        tiers: [...service.pricing.tiers, newTier]
      }
    });
  };

  const updatePricingTier = (index: number, updates: any) => {
    const updatedTiers = service.pricing.tiers.map((tier, i) => 
      i === index ? { ...tier, ...updates } : tier
    );
    updateService({
      pricing: {
        ...service.pricing,
        tiers: updatedTiers
      }
    });
  };

  const removePricingTier = (index: number) => {
    const updatedTiers = service.pricing.tiers.filter((_, i) => i !== index);
    updateService({
      pricing: {
        ...service.pricing,
        tiers: updatedTiers
      }
    });
  };

  const addDeliverable = () => {
    updateService({
      deliverables: [...service.deliverables, { name: '', description: '', timeline: '' }]
    });
  };

  const updateDeliverable = (index: number, updates: any) => {
    const updatedDeliverables = service.deliverables.map((deliverable, i) =>
      i === index ? { ...deliverable, ...updates } : deliverable
    );
    updateService({ deliverables: updatedDeliverables });
  };

  const removeDeliverable = (index: number) => {
    const updatedDeliverables = service.deliverables.filter((_, i) => i !== index);
    updateService({ deliverables: updatedDeliverables });
  };

  const addAddOn = () => {
    updateService({
      addOns: [...service.addOns, { name: '', description: '', price: 0, estimatedTime: '' }]
    });
  };

  const updateAddOn = (index: number, updates: any) => {
    const updatedAddOns = service.addOns.map((addOn, i) =>
      i === index ? { ...addOn, ...updates } : addOn
    );
    updateService({ addOns: updatedAddOns });
  };

  const removeAddOn = (index: number) => {
    const updatedAddOns = service.addOns.filter((_, i) => i !== index);
    updateService({ addOns: updatedAddOns });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'pricing', label: 'Pricing & Tiers', icon: '💰' },
    { id: 'deliverables', label: 'Deliverables', icon: '📦' },
    { id: 'addons', label: 'Add-ons', icon: '➕' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {service.id ? 'Edit Service Package' : 'Create Service Package'}
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="btn"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Package'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 py-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && (
            <BasicInfoTab
              service={service}
              categories={categories}
              onUpdate={updateService}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingTab
              service={service}
              onUpdate={updateService}
              onAddTier={addPricingTier}
              onUpdateTier={updatePricingTier}
              onRemoveTier={removePricingTier}
            />
          )}

          {activeTab === 'deliverables' && (
            <DeliverablesTab
              service={service}
              onAdd={addDeliverable}
              onUpdate={updateDeliverable}
              onRemove={removeDeliverable}
            />
          )}

          {activeTab === 'addons' && (
            <AddOnsTab
              service={service}
              onAdd={addAddOn}
              onUpdate={updateAddOn}
              onRemove={removeAddOn}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              service={service}
              onUpdate={updateService}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Components
function BasicInfoTab({ service, categories, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Package Name *
          </label>
          <input
            type="text"
            value={service.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="input w-full"
            placeholder="e.g., Security Audit Complete"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category *
          </label>
          <select
            value={service.categoryId}
            onChange={(e) => onUpdate({ categoryId: e.target.value })}
            className="input w-full"
          >
            <option value="">Select a category</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          value={service.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="input w-full h-32"
          placeholder="Detailed description of what's included in this service package..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estimated Duration
          </label>
          <input
            type="text"
            value={service.estimatedDuration}
            onChange={(e) => onUpdate({ estimatedDuration: e.target.value })}
            className="input w-full"
            placeholder="e.g., 2-3 weeks"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Included Revisions
          </label>
          <input
            type="number"
            value={service.revisions}
            onChange={(e) => onUpdate({ revisions: parseInt(e.target.value) || 0 })}
            className="input w-full"
            min="0"
            max="10"
          />
        </div>
      </div>
    </div>
  );
}

function PricingTab({ service, onUpdate, onAddTier, onUpdateTier, onRemoveTier }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pricing Type
          </label>
          <select
            value={service.pricing.type}
            onChange={(e) => onUpdate({ 
              pricing: { ...service.pricing, type: e.target.value }
            })}
            className="input w-full"
          >
            <option value="fixed">Fixed Price</option>
            <option value="hourly">Hourly Rate</option>
            <option value="milestone">Milestone-based</option>
            <option value="custom">Custom Quote</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base Price
          </label>
          <input
            type="number"
            value={service.pricing.basePrice}
            onChange={(e) => onUpdate({ 
              pricing: { ...service.pricing, basePrice: parseFloat(e.target.value) || 0 }
            })}
            className="input w-full"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Currency
          </label>
          <select
            value={service.pricing.currency}
            onChange={(e) => onUpdate({ 
              pricing: { ...service.pricing, currency: e.target.value }
            })}
            className="input w-full"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Pricing Tiers
          </h3>
          <button
            onClick={onAddTier}
            className="btn-secondary"
          >
            + Add Tier
          </button>
        </div>

        {service.pricing.tiers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <span className="text-3xl mb-2 block">💰</span>
            <p className="text-gray-600 dark:text-gray-400">
              Add pricing tiers to offer different service levels
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {service.pricing.tiers.map((tier: any, index: number) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tier Name
                    </label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => onUpdateTier(index, { name: e.target.value })}
                      className="input w-full"
                      placeholder="Basic, Premium, Enterprise"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => onUpdateTier(index, { price: parseFloat(e.target.value) || 0 })}
                      className="input w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estimated Time
                    </label>
                    <input
                      type="text"
                      value={tier.estimatedTime}
                      onChange={(e) => onUpdateTier(index, { estimatedTime: e.target.value })}
                      className="input w-full"
                      placeholder="1-2 weeks"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tier.isPopular}
                        onChange={(e) => onUpdateTier(index, { isPopular: e.target.checked })}
                        className="h-4 w-4 text-brand"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Popular</span>
                    </label>
                    <button
                      onClick={() => onRemoveTier(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Features (one per line)
                  </label>
                  <textarea
                    value={tier.features.join('\n')}
                    onChange={(e) => onUpdateTier(index, { 
                      features: e.target.value.split('\n').filter(f => f.trim()) 
                    })}
                    className="input w-full h-24"
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeliverablesTab({ service, onAdd, onUpdate, onRemove }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Deliverables
        </h3>
        <button onClick={onAdd} className="btn-secondary">
          + Add Deliverable
        </button>
      </div>

      {service.deliverables.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <span className="text-3xl mb-2 block">📦</span>
          <p className="text-gray-600 dark:text-gray-400">
            Define what clients will receive from this service
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {service.deliverables.map((deliverable: any, index: number) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deliverable Name
                  </label>
                  <input
                    type="text"
                    value={deliverable.name}
                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Security Report"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={deliverable.timeline}
                    onChange={(e) => onUpdate(index, { timeline: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Week 2"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => onRemove(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={deliverable.description}
                  onChange={(e) => onUpdate(index, { description: e.target.value })}
                  className="input w-full h-20"
                  placeholder="Detailed description of this deliverable..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddOnsTab({ service, onAdd, onUpdate, onRemove }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Add-on Services
        </h3>
        <button onClick={onAdd} className="btn-secondary">
          + Add Add-on
        </button>
      </div>

      {service.addOns.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <span className="text-3xl mb-2 block">➕</span>
          <p className="text-gray-600 dark:text-gray-400">
            Offer additional services to increase project value
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {service.addOns.map((addOn: any, index: number) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add-on Name
                  </label>
                  <input
                    type="text"
                    value={addOn.name}
                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Extra Report Copy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    value={addOn.price}
                    onChange={(e) => onUpdate(index, { price: parseFloat(e.target.value) || 0 })}
                    className="input w-full"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    value={addOn.estimatedTime}
                    onChange={(e) => onUpdate(index, { estimatedTime: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., +2 days"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => onRemove(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={addOn.description}
                  onChange={(e) => onUpdate(index, { description: e.target.value })}
                  className="input w-full h-20"
                  placeholder="What's included in this add-on service..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ service, onUpdate }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Service Settings
          </h3>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={service.isActive}
              onChange={(e) => onUpdate({ isActive: e.target.checked })}
              className="h-4 w-4 text-brand"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Service is active and visible to clients
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={service.isFeatured}
              onChange={(e) => onUpdate({ isFeatured: e.target.checked })}
              className="h-4 w-4 text-brand"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Feature this service (shows in featured section)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={service.supportIncluded}
              onChange={(e) => onUpdate({ supportIncluded: e.target.checked })}
              className="h-4 w-4 text-brand"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Include ongoing support after delivery
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Prerequisites
          </h3>
          <textarea
            value={service.prerequisites.join('\n')}
            onChange={(e) => onUpdate({ 
              prerequisites: e.target.value.split('\n').filter(p => p.trim()) 
            })}
            className="input w-full h-32"
            placeholder="What clients need to provide (one per line)&#10;e.g., Access to production environment&#10;Technical documentation&#10;Stakeholder availability"
          />
          <p className="text-sm text-gray-500 mt-2">
            List what clients need to provide or prepare before starting this service
          </p>
        </div>
      </div>
    </div>
  );
}
