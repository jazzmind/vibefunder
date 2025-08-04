'use client';
import { useState } from 'react';

interface PledgeTier {
  id: string;
  title: string;
  description?: string;
  amountDollars: number;
  benefits: string[];
  isActive: boolean;
  order: number;
}

const DEFAULT_PLEDGE_TIERS = [
  { id: 'default-1', title: 'Early Supporter', description: 'Support the project early', amountDollars: 1000, benefits: [], isActive: true, order: 1 },
  { id: 'default-2', title: 'Team Supporter', description: 'Help fund development', amountDollars: 5000, benefits: [], isActive: true, order: 2 },
  { id: 'default-3', title: 'Strategic Backer', description: 'Strategic partnership', amountDollars: 10000, benefits: [], isActive: true, order: 3 },
  { id: 'default-4', title: 'Premier Partner', description: 'Premium access and support', amountDollars: 25000, benefits: [], isActive: true, order: 4 },
  { id: 'default-5', title: 'Foundation Backer', description: 'Foundational support', amountDollars: 50000, benefits: [], isActive: true, order: 5 },
];

export function PledgeButton({ campaignId, pledgeTiers = [] }: { campaignId: string; pledgeTiers?: PledgeTier[] }){
  // Use campaign-specific tiers or fall back to defaults
  const activeTiers = pledgeTiers.length > 0 
    ? pledgeTiers.filter(tier => tier.isActive).sort((a, b) => a.order - b.order)
    : DEFAULT_PLEDGE_TIERS;
  
  const[loading,setLoading]=useState(false);
  const[email,setEmail]=useState('');
  const[selectedAmount, setSelectedAmount] = useState(activeTiers[1]?.amountDollars || activeTiers[0]?.amountDollars || 1000);
  const[customAmount, setCustomAmount] = useState('');
  const[useCustomAmount, setUseCustomAmount] = useState(false);
  
  const finalAmount = useCustomAmount ? 
    Math.max(100, parseInt(customAmount) || 0) : 
    selectedAmount;
  
  async function startCheckout(){
    if (finalAmount < 100) {
      alert('Minimum pledge amount is $100');
      return;
    }
    
    setLoading(true);
    const res=await fetch('/api/checkout-session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        campaignId,
        backerEmail:email,
        pledgeAmount: finalAmount
      })
    });
    const data=await res.json();
    setLoading(false);
    if(data.url)window.location.href=data.url;
    else if(data.error) alert(data.error);
  }
  
  return(
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Back this project</h3>
      <div className="space-y-6">
        {/* Pledge Amount Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select pledge amount</label>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {activeTiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setSelectedAmount(tier.amountDollars);
                  setUseCustomAmount(false);
                }}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  !useCustomAmount && selectedAmount === tier.amountDollars
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">${tier.amountDollars.toLocaleString()}</div>
                <div className="text-sm text-gray-600">{tier.title}</div>
                {tier.description && (
                  <div className="text-xs text-gray-500 mt-1">{tier.description}</div>
                )}
                {tier.benefits.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    <ul className="list-disc list-inside">
                      {tier.benefits.slice(0, 2).map((benefit, i) => (
                        <li key={i}>{benefit}</li>
                      ))}
                      {tier.benefits.length > 2 && (
                        <li>+{tier.benefits.length - 2} more benefits</li>
                      )}
                    </ul>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {/* Custom Amount */}
          <div className="border rounded-lg p-3">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                checked={useCustomAmount}
                onChange={(e) => setUseCustomAmount(e.target.checked)}
                className="text-brand focus:ring-brand"
              />
              <span className="font-semibold">Custom amount</span>
            </label>
            {useCustomAmount && (
              <div className="mt-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="100"
                    placeholder="1,000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum $100</p>
              </div>
            )}
          </div>
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
          <input 
            type="email"
            placeholder="you@company.com" 
            value={email} 
            onChange={e=>setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none"
          />
        </div>

        {/* Submit Button */}
        <button 
          className="w-full btn" 
          onClick={startCheckout} 
          disabled={loading||!email||finalAmount<100}
        >
          {loading 
            ? 'Redirecting...' 
            : `Pledge $${finalAmount.toLocaleString()} via Stripe`
          }
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          Secure payment via Stripe. Funds held in escrow until milestones are met.
        </p>
      </div>
    </div>
  );
}