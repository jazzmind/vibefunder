'use client';

interface PriceTier {
  id?: string;
  title: string;
  description: string;
  amountDollars: number;
  benefits: string[];
}

interface FormData {
  priceTiers: PriceTier[];
}

interface PriceTiersTabProps {
  formData: FormData;
  onDeletePriceTier: (index: number) => void;
  onSetPriceTierModalOpen: (open: boolean) => void;
  onSetEditingPriceTier: (data: {index: number, data: any} | null) => void;
}

export default function PriceTiersTab({
  formData,
  onDeletePriceTier,
  onSetPriceTierModalOpen,
  onSetEditingPriceTier
}: PriceTiersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">Price Tiers</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define different pledge levels and rewards for your backers
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSetPriceTierModalOpen(true)}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
        >
          + Add Tier
        </button>
      </div>

      {/* Current Price Tiers */}
      <div className="space-y-4">
        {formData.priceTiers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No price tiers created yet. Add tiers to give backers different pledge options.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {formData.priceTiers.map((tier, index) => (
              <div key={tier.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h6 className="font-medium text-gray-900 dark:text-white">{tier.title}</h6>
                      <span className="text-lg font-bold text-brand">${tier.amountDollars}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSetEditingPriceTier({ index, data: tier });
                        onSetPriceTierModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePriceTier(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {tier.benefits && tier.benefits.length > 0 && (
                  <div className="bg-white dark:bg-gray-700 rounded p-3">
                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Benefits:</h6>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {tier.benefits.map((benefit: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Price Tier Tips</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Start with a basic tier at 25-50% of your average expected pledge</li>
          <li>• Offer compelling value at each tier level</li>
          <li>• Include early bird discounts to create urgency</li>
          <li>• Premium tiers should offer exclusive access or personalized service</li>
        </ul>
      </div>
    </div>
  );
}
