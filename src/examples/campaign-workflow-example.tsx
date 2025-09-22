/**
 * Campaign Workflow Orchestration Example
 *
 * Comprehensive example showing how to integrate Claude Code SDK
 * with Vibefunder's campaign creation and management workflow.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ClaudeCodeSDK } from '../lib/claude-code-sdk';
import { SwarmDashboard, CampaignOrchestrator, PaymentProcessor } from '../components/claude-code-components';
import { useClaudeCodeSwarm, useCampaignOrchestration, useTaskMonitoring } from '../lib/claude-code-hooks';

// ============================================================================
// Main Campaign Workflow Example
// ============================================================================

interface CampaignData {
  id: string;
  title: string;
  summary: string;
  description: string;
  fundingGoalDollars: number;
  sectors: string[];
  deployModes: string[];
  maker: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CampaignWorkflowExample() {
  // Initialize Claude Code SDK with Vibefunder-specific configuration
  const claudeCodeConfig = {
    swarmTopology: 'adaptive' as const,
    maxAgents: 15,
    enableVerification: true,
    enablePairProgramming: false,
    truthThreshold: 0.95,
    githubIntegration: true,
    baseUrl: process.env.NEXT_PUBLIC_CLAUDE_FLOW_URL || 'https://api.claude-flow.ai',
    webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/claude-flow/webhook`
  };

  const { sdk, isInitialized } = useClaudeCodeSwarm(claudeCodeConfig);
  const [currentStep, setCurrentStep] = useState<'setup' | 'campaign' | 'payment'>('setup');
  const [sampleCampaign, setSampleCampaign] = useState<CampaignData>({
    id: 'campaign-demo-001',
    title: 'AI-Powered Code Review Assistant',
    summary: 'Revolutionize code review with intelligent automation and developer experience',
    description: '',
    fundingGoalDollars: 50000,
    sectors: ['developer-tools', 'artificial-intelligence'],
    deployModes: ['saas', 'on-premise'],
    maker: {
      id: 'maker-001',
      name: 'Jane Developer',
      email: 'jane@example.com'
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Claude Code Campaign Workflow
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Demonstration of AI-powered campaign orchestration with multi-agent coordination
          </p>
        </header>

        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-4">
            {(['setup', 'campaign', 'payment'] as const).map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentStep === step
                    ? 'bg-brand text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </button>
            ))}
          </div>
        </nav>

        {/* Content based on current step */}
        {currentStep === 'setup' && (
          <SwarmSetupStep config={claudeCodeConfig} isInitialized={isInitialized} />
        )}

        {currentStep === 'campaign' && isInitialized && (
          <CampaignOrchestrationStep
            sdk={sdk}
            campaignData={sampleCampaign}
            onCampaignUpdate={setSampleCampaign}
          />
        )}

        {currentStep === 'payment' && isInitialized && (
          <PaymentProcessingStep sdk={sdk} campaignId={sampleCampaign.id} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface SwarmSetupStepProps {
  config: any;
  isInitialized: boolean;
}

function SwarmSetupStep({ config, isInitialized }: SwarmSetupStepProps) {
  return (
    <div className="space-y-6">
      <SwarmDashboard config={config} />

      {/* Configuration Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Configuration Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Swarm Topology
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{config.swarmTopology}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Agents
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{config.maxAgents}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Truth Threshold
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{config.truthThreshold * 100}%</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Verification Enabled
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.enableVerification ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                GitHub Integration
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.githubIntegration ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pair Programming
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.enablePairProgramming ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CampaignOrchestrationStepProps {
  sdk: ClaudeCodeSDK;
  campaignData: CampaignData;
  onCampaignUpdate: (campaign: CampaignData) => void;
}

function CampaignOrchestrationStep({ sdk, campaignData, onCampaignUpdate }: CampaignOrchestrationStepProps) {
  const { activeCampaigns } = useCampaignOrchestration(sdk);
  const { tasks } = useTaskMonitoring(sdk);
  const [generatedContent, setGeneratedContent] = useState<Record<string, any>>({});

  // Simulate receiving generated content from agents
  useEffect(() => {
    const handleTaskCompleted = (result: any) => {
      if (result.results?.content) {
        setGeneratedContent(prev => ({
          ...prev,
          [result.taskId]: result.results.content
        }));
      }
    };

    sdk.on('task:completed', handleTaskCompleted);
    return () => sdk.removeListener('task:completed', handleTaskCompleted);
  }, [sdk]);

  return (
    <div className="space-y-6">
      {/* Campaign Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Campaign Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campaign Title
              </label>
              <input
                type="text"
                value={campaignData.title}
                onChange={(e) => onCampaignUpdate({ ...campaignData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Summary
              </label>
              <textarea
                value={campaignData.summary}
                onChange={(e) => onCampaignUpdate({ ...campaignData, summary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Funding Goal ($)
              </label>
              <input
                type="number"
                value={campaignData.fundingGoalDollars}
                onChange={(e) => onCampaignUpdate({ ...campaignData, fundingGoalDollars: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sectors
              </label>
              <div className="flex flex-wrap gap-2">
                {campaignData.sectors.map((sector, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deploy Modes
              </label>
              <div className="flex flex-wrap gap-2">
                {campaignData.deployModes.map((mode, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm"
                  >
                    {mode}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maker
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {campaignData.maker.name} ({campaignData.maker.email})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Orchestration */}
      <CampaignOrchestrator
        sdk={sdk}
        campaignId={campaignData.id}
        campaignData={campaignData}
      />

      {/* Generated Content Display */}
      {Object.keys(generatedContent).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI Generated Content
          </h3>
          <div className="space-y-4">
            {Object.entries(generatedContent).map(([taskId, content]) => (
              <div key={taskId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Task: {taskId}
                </h4>
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {JSON.stringify(content, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PaymentProcessingStepProps {
  sdk: ClaudeCodeSDK;
  campaignId: string;
}

function PaymentProcessingStep({ sdk, campaignId }: PaymentProcessingStepProps) {
  const [paymentSimulation, setPaymentSimulation] = useState({
    pledgeAmount: 100,
    paymentMethod: 'card',
    testMode: true
  });

  const simulatePaymentFlow = async () => {
    try {
      // Simulate creating a pledge
      const pledgeData = {
        pledgeId: `pledge-${Date.now()}`,
        campaignId,
        amount: paymentSimulation.pledgeAmount * 100, // Convert to cents
        currency: 'usd',
        paymentMethod: paymentSimulation.paymentMethod,
        metadata: {
          testMode: paymentSimulation.testMode,
          source: 'claude-code-demo'
        }
      };

      console.log('Simulating payment flow:', pledgeData);

      // This would trigger the actual payment processing workflow
      await sdk.orchestratePaymentProcessing(pledgeData);
    } catch (error) {
      console.error('Payment simulation failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Processor Component */}
      <PaymentProcessor sdk={sdk} />

      {/* Payment Simulation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Flow Simulation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pledge Amount ($)
              </label>
              <input
                type="number"
                value={paymentSimulation.pledgeAmount}
                onChange={(e) => setPaymentSimulation({
                  ...paymentSimulation,
                  pledgeAmount: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentSimulation.paymentMethod}
                onChange={(e) => setPaymentSimulation({
                  ...paymentSimulation,
                  paymentMethod: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="testMode"
                checked={paymentSimulation.testMode}
                onChange={(e) => setPaymentSimulation({
                  ...paymentSimulation,
                  testMode: e.target.checked
                })}
                className="mr-2 text-brand focus:ring-brand"
              />
              <label htmlFor="testMode" className="text-sm text-gray-700 dark:text-gray-300">
                Test Mode
              </label>
            </div>
            <button
              onClick={simulatePaymentFlow}
              className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
            >
              Simulate Payment Flow
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Expected Workflow
              </h4>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Payment validation and security checks</li>
                <li>2. Stripe payment intent creation</li>
                <li>3. Transaction processing</li>
                <li>4. Campaign funding update</li>
                <li>5. Confirmation emails and notifications</li>
                <li>6. Webhook event processing</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Integration Notes */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Stripe Integration Points
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Payment intent creation with metadata for campaign tracking</li>
          <li>• Webhook processing for payment status updates</li>
          <li>• Application fee configuration for platform revenue</li>
          <li>• Multi-party payment support for campaign makers</li>
          <li>• Automated refund processing for failed campaigns</li>
          <li>• Compliance with PCI DSS requirements</li>
        </ul>
      </div>
    </div>
  );
}