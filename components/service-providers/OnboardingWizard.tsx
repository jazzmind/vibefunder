'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isCompleted?: boolean;
  isOptional?: boolean;
}

interface OnboardingData {
  // Basic Information
  organizationType: 'service_provider';
  name: string;
  shortDescription: string;
  description: string;
  website: string;
  email: string;
  
  // Business Details
  businessType: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Service Information
  services: string[];
  specialties: string[];
  targetMarkets: string[];
  
  // Media & Portfolio
  logo: string;
  portfolioItems: Array<{
    title: string;
    description: string;
    url?: string;
    image?: string;
  }>;
  
  // Team Information
  teamMembers: Array<{
    name: string;
    title: string;
    bio: string;
    linkedin?: string;
    github?: string;
    headshot?: string;
  }>;
  
  // Verification
  verificationDocuments: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  
  // AI Enhancement
  domainForAI?: string;
  useAIEnhancement: boolean;
}

// Step Components
const BasicInformationStep = ({ data, updateData, onNext, onBack }: any) => {
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  const handleAIGeneration = async () => {
    if (!data.website) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/services/generate-from-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: data.website,
          userPrompt: 'Generate comprehensive service provider profile for marketplace onboarding'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAiSuggestions(result.generated);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const applyAISuggestions = () => {
    if (!aiSuggestions) return;
    
    updateData({
      name: aiSuggestions.name || data.name,
      shortDescription: aiSuggestions.valueProposition || data.shortDescription,
      description: aiSuggestions.description || data.description,
      specialties: aiSuggestions.specialties || data.specialties,
      targetMarkets: aiSuggestions.targetMarket ? [aiSuggestions.targetMarket] : data.targetMarkets
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Basic Information</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Let's start with the basics about your organization
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            className="input w-full"
            placeholder="Your organization name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website *
          </label>
          <div className="flex space-x-2">
            <input
              type="url"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              className="input flex-1"
              placeholder="https://yourcompany.com"
              required
            />
            <button
              type="button"
              onClick={handleAIGeneration}
              disabled={!data.website || generating}
              className="btn-secondary px-4 py-2 whitespace-nowrap"
            >
              {generating ? 'Generating...' : '🤖 AI Help'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Enter your website to enable AI-powered profile suggestions
          </p>
        </div>

        {aiSuggestions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                AI Suggestions Based on Your Website
              </h3>
              <button
                type="button"
                onClick={applyAISuggestions}
                className="text-sm btn"
              >
                Apply All
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {aiSuggestions.name}</div>
              <div><strong>Value Prop:</strong> {aiSuggestions.valueProposition}</div>
              <div><strong>Specialties:</strong> {aiSuggestions.specialties?.join(', ')}</div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Short Description *
          </label>
          <input
            type="text"
            value={data.shortDescription}
            onChange={(e) => updateData({ shortDescription: e.target.value })}
            className="input w-full"
            placeholder="A brief one-line description of what you do"
            maxLength={200}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {data.shortDescription.length}/200 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Email *
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            className="input w-full"
            placeholder="contact@yourcompany.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Detailed Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            className="input w-full h-32"
            placeholder="Provide a detailed description of your organization, services, and what makes you unique..."
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
          disabled
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!data.name || !data.website || !data.email || !data.shortDescription}
          className="btn"
        >
          Next: Business Details
        </button>
      </div>
    </div>
  );
};

const BusinessDetailsStep = ({ data, updateData, onNext, onBack }: any) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Business Details</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Tell us about your business structure and location
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Type
          </label>
          <select
            value={data.businessType}
            onChange={(e) => updateData({ businessType: e.target.value })}
            className="input w-full"
          >
            <option value="company">Company/Corporation</option>
            <option value="llc">LLC</option>
            <option value="partnership">Partnership</option>
            <option value="sole_proprietor">Sole Proprietorship</option>
            <option value="non_profit">Non-Profit</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tax ID (Optional)
          </label>
          <input
            type="text"
            value={data.taxId}
            onChange={(e) => updateData({ taxId: e.target.value })}
            className="input w-full"
            placeholder="EIN or Tax ID Number"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Business Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Street Address
          </label>
          <input
            type="text"
            value={data.address.street}
            onChange={(e) => updateData({ 
              address: { ...data.address, street: e.target.value }
            })}
            className="input w-full"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City
            </label>
            <input
              type="text"
              value={data.address.city}
              onChange={(e) => updateData({ 
                address: { ...data.address, city: e.target.value }
              })}
              className="input w-full"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State/Province
            </label>
            <input
              type="text"
              value={data.address.state}
              onChange={(e) => updateData({ 
                address: { ...data.address, state: e.target.value }
              })}
              className="input w-full"
              placeholder="State"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={data.address.postalCode}
              onChange={(e) => updateData({ 
                address: { ...data.address, postalCode: e.target.value }
              })}
              className="input w-full"
              placeholder="ZIP/Postal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country
          </label>
          <select
            value={data.address.country}
            onChange={(e) => updateData({ 
              address: { ...data.address, country: e.target.value }
            })}
            className="input w-full"
          >
            <option value="">Select Country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn"
        >
          Next: Services
        </button>
      </div>
    </div>
  );
};

const ServicesStep = ({ data, updateData, onNext, onBack }: any) => {
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [customTarget, setCustomTarget] = useState('');

  useEffect(() => {
    const loadServiceCategories = async () => {
      try {
        const response = await fetch('/api/services/categories');
        if (response.ok) {
          const categories = await response.json();
          setServiceCategories(categories);
        }
      } catch (error) {
        console.error('Failed to load service categories:', error);
      }
    };
    loadServiceCategories();
  }, []);

  const addSpecialty = () => {
    if (customSpecialty && !data.specialties.includes(customSpecialty)) {
      updateData({
        specialties: [...data.specialties, customSpecialty]
      });
      setCustomSpecialty('');
    }
  };

  const addTargetMarket = () => {
    if (customTarget && !data.targetMarkets.includes(customTarget)) {
      updateData({
        targetMarkets: [...data.targetMarkets, customTarget]
      });
      setCustomTarget('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Offerings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Select the services you provide and your areas of expertise
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Service Categories *
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {serviceCategories.map((category) => (
            <label key={category.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={data.services.includes(category.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateData({
                      services: [...data.services, category.id]
                    });
                  } else {
                    updateData({
                      services: data.services.filter((id: string) => id !== category.id)
                    });
                  }
                }}
                className="h-4 w-4 text-brand"
              />
              <span className="text-xl">{category.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {category.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Specialties & Expertise
        </h3>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={customSpecialty}
              onChange={(e) => setCustomSpecialty(e.target.value)}
              placeholder="Add a specialty (e.g., 'AI/ML Implementation', 'Security Audits')"
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="btn-secondary"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.specialties.map((specialty: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand/10 text-brand"
              >
                {specialty}
                <button
                  type="button"
                  onClick={() => updateData({
                    specialties: data.specialties.filter((_: string, i: number) => i !== index)
                  })}
                  className="ml-2 text-brand/70 hover:text-brand"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Target Markets
        </h3>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="Add target market (e.g., 'Fintech Startups', 'Enterprise SaaS')"
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addTargetMarket()}
            />
            <button
              type="button"
              onClick={addTargetMarket}
              className="btn-secondary"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.targetMarkets.map((market: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {market}
                <button
                  type="button"
                  onClick={() => updateData({
                    targetMarkets: data.targetMarkets.filter((_: string, i: number) => i !== index)
                  })}
                  className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={data.services.length === 0}
          className="btn"
        >
          Next: Portfolio
        </button>
      </div>
    </div>
  );
};

const PortfolioStep = ({ data, updateData, onNext, onBack }: any) => {
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: '',
    description: '',
    url: ''
  });

  const addPortfolioItem = () => {
    if (newPortfolioItem.title && newPortfolioItem.description) {
      updateData({
        portfolioItems: [...data.portfolioItems, { ...newPortfolioItem }]
      });
      setNewPortfolioItem({ title: '', description: '', url: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio & Case Studies</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Showcase your best work to attract clients (Optional)
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Add Portfolio Item
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Title
            </label>
            <input
              type="text"
              value={newPortfolioItem.title}
              onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
              className="input w-full"
              placeholder="E.g., 'Security Audit for FinTech Startup'"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newPortfolioItem.description}
              onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
              className="input w-full h-24"
              placeholder="Brief description of the project and your contribution..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project URL (Optional)
            </label>
            <input
              type="url"
              value={newPortfolioItem.url}
              onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, url: e.target.value })}
              className="input w-full"
              placeholder="https://..."
            />
          </div>
          <button
            type="button"
            onClick={addPortfolioItem}
            disabled={!newPortfolioItem.title || !newPortfolioItem.description}
            className="btn"
          >
            Add Portfolio Item
          </button>
        </div>
      </div>

      {data.portfolioItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Your Portfolio Items
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.portfolioItems.map((item: any, index: number) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                  <button
                    type="button"
                    onClick={() => updateData({
                      portfolioItems: data.portfolioItems.filter((_: any, i: number) => i !== index)
                    })}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{item.description}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-brand text-sm hover:underline">
                    View Project →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="btn"
        >
          Next: Review & Submit
        </button>
      </div>
    </div>
  );
};

const ReviewStep = ({ data, onSubmit, onBack, loading }: any) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Submit</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review your information before submitting your application
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h3>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Name:</span> {data.name}</div>
            <div><span className="font-medium">Email:</span> {data.email}</div>
            <div><span className="font-medium">Website:</span> {data.website}</div>
            <div><span className="font-medium">Description:</span> {data.shortDescription}</div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Services</h3>
          <div className="text-sm">
            <div><span className="font-medium">Service Categories:</span> {data.services.length} selected</div>
            <div><span className="font-medium">Specialties:</span> {data.specialties.join(', ') || 'None added'}</div>
            <div><span className="font-medium">Target Markets:</span> {data.targetMarkets.join(', ') || 'None added'}</div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Portfolio</h3>
          <div className="text-sm">
            <div><span className="font-medium">Portfolio Items:</span> {data.portfolioItems.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Your application will be reviewed by our team</li>
          <li>• We'll verify your information and contact you within 2-3 business days</li>
          <li>• Once approved, you can start listing your services and connecting with clients</li>
          <li>• You'll receive email updates about your application status</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
          disabled={loading}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="btn"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [data, setData] = useState<OnboardingData>({
    organizationType: 'service_provider',
    name: '',
    shortDescription: '',
    description: '',
    website: '',
    email: '',
    businessType: 'company',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    services: [],
    specialties: [],
    targetMarkets: [],
    logo: '',
    portfolioItems: [],
    teamMembers: [],
    verificationDocuments: [],
    useAIEnhancement: true
  });

  const steps: OnboardingStep[] = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Organization details and contact information',
      component: BasicInformationStep
    },
    {
      id: 'business',
      title: 'Business Details',
      description: 'Business structure and location',
      component: BusinessDetailsStep
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Service offerings and expertise',
      component: ServicesStep
    },
    {
      id: 'portfolio',
      title: 'Portfolio',
      description: 'Showcase your work',
      component: PortfolioStep,
      isOptional: true
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review and submit application',
      component: ReviewStep
    }
  ];

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          type: 'service_provider',
          portfolioItems: JSON.stringify(data.portfolioItems)
        })
      });

      const result = await response.json();

      if (response.ok) {
        router.push('/dashboard?message=service-provider-application-submitted');
      } else {
        setError(result.error || 'Failed to submit application');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${index <= currentStep 
                    ? 'bg-brand border-brand text-white' 
                    : 'border-gray-300 text-gray-400'
                  }
                `}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    index <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-20 h-px mx-4 ${
                    index < currentStep ? 'bg-brand' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Current Step */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <CurrentStepComponent
            data={data}
            updateData={updateData}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
