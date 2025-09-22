/**
 * Claude Code React Components for Vibefunder
 *
 * UI components providing visual interfaces for Claude Code SDK functionality
 * integrated with Vibefunder's design system and workflow patterns.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ClaudeCodeSDK, AgentDefinition, SwarmResult } from '../lib/claude-code-sdk';
import {
  useClaudeCodeSwarm,
  useCampaignOrchestration,
  usePaymentProcessing,
  useTaskMonitoring,
  usePerformanceMonitoring,
  useErrorRecovery
} from '../lib/claude-code-hooks';

// ============================================================================
// Core Swarm Management Component
// ============================================================================

interface SwarmDashboardProps {
  config: any;
  className?: string;
}

export function SwarmDashboard({ config, className = '' }: SwarmDashboardProps) {
  const { sdk, swarmId, isInitialized, error, agents, spawnSpecializedAgents } = useClaudeCodeSwarm(config);
  const { metrics, optimizePerformance, isOptimizing } = usePerformanceMonitoring(sdk);
  const { errors, unresolvedCount } = useErrorRecovery(sdk);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Claude Code Swarm Control
        </h2>
        <div className="flex items-center gap-3">
          {isInitialized ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium">
              ✓ Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm font-medium">
              ⏳ Initializing
            </span>
          )}
          {unresolvedCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm font-medium">
              {unresolvedCount} errors
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Swarm Status</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">ID: {swarmId || 'Not initialized'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Agents: {agents.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Topology: {config.swarmTopology}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Performance</h3>
          {metrics ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Health: {Math.round(metrics.swarmHealth * 100)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Throughput: {metrics.taskThroughput}/min
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Truth Score: {Math.round(metrics.verificationScores?.average * 100)}%
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading metrics...</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={spawnSpecializedAgents}
              disabled={!isInitialized}
              className="w-full px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Deploy Agents
            </button>
            <button
              onClick={optimizePerformance}
              disabled={!isInitialized || isOptimizing}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize'}
            </button>
          </div>
        </div>
      </div>

      <AgentList agents={agents} />
    </div>
  );
}

// ============================================================================
// Agent Management Components
// ============================================================================

interface AgentListProps {
  agents: AgentDefinition[];
}

function AgentList({ agents }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No agents spawned yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Agents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: AgentDefinition;
}

function AgentCard({ agent }: AgentCardProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    high: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white">{agent.name}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[agent.priority]}`}>
          {agent.priority}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Type: {agent.type}</p>
      {agent.cognitivePattern && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Pattern: {agent.cognitivePattern}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {agent.capabilities.slice(0, 3).map((capability, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs"
          >
            {capability}
          </span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="px-2 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">
            +{agent.capabilities.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Campaign Orchestration Components
// ============================================================================

interface CampaignOrchestratorProps {
  sdk: ClaudeCodeSDK;
  campaignId: string;
  campaignData: any;
  className?: string;
}

export function CampaignOrchestrator({ sdk, campaignId, campaignData, className = '' }: CampaignOrchestratorProps) {
  const { activeCampaigns, isProcessing, createCampaign, optimizeCampaign, generateCampaignContent } = useCampaignOrchestration(sdk);
  const { tasks, monitorTask } = useTaskMonitoring(sdk);
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);

  const optimizationOptions = [
    'Content engagement',
    'Funding goal alignment',
    'Milestone clarity',
    'Price tier optimization',
    'Market positioning'
  ];

  const handleCreateCampaign = async () => {
    try {
      await createCampaign(campaignData);
    } catch (error) {
      console.error('Campaign creation failed:', error);
    }
  };

  const handleOptimizeCampaign = async () => {
    if (selectedOptimizations.length === 0) return;

    try {
      await optimizeCampaign(campaignId, selectedOptimizations);
    } catch (error) {
      console.error('Campaign optimization failed:', error);
    }
  };

  const handleGenerateContent = async (contentType: 'description' | 'milestones' | 'stretch-goals') => {
    try {
      const task = await generateCampaignContent(campaignId, contentType);
      await monitorTask(task.taskId);
    } catch (error) {
      console.error('Content generation failed:', error);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Campaign AI Orchestration
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Operations */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={handleCreateCampaign}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Creating...' : 'Create Campaign'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleGenerateContent('description')}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Gen Description
                </button>
                <button
                  onClick={() => handleGenerateContent('milestones')}
                  className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Gen Milestones
                </button>
                <button
                  onClick={() => handleGenerateContent('stretch-goals')}
                  className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                >
                  Gen Goals
                </button>
              </div>
            </div>
          </div>

          {/* Optimization Panel */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Optimization Goals</h4>
            <div className="space-y-2">
              {optimizationOptions.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOptimizations.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOptimizations([...selectedOptimizations, option]);
                      } else {
                        setSelectedOptimizations(selectedOptimizations.filter(o => o !== option));
                      }
                    }}
                    className="mr-2 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleOptimizeCampaign}
              disabled={isProcessing || selectedOptimizations.length === 0}
              className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Optimizing...' : 'Optimize Campaign'}
            </button>
          </div>
        </div>

        {/* Status and Results */}
        <div className="space-y-4">
          <TaskStatusPanel tasks={Array.from(tasks.values())} />
          <CampaignResultsPanel results={Array.from(activeCampaigns.values())} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Payment Processing Components
// ============================================================================

interface PaymentProcessorProps {
  sdk: ClaudeCodeSDK;
  className?: string;
}

export function PaymentProcessor({ sdk, className = '' }: PaymentProcessorProps) {
  const { activePayments, paymentStats, processPayment, validatePaymentMethod } = usePaymentProcessing(sdk);
  const [testPayment, setTestPayment] = useState({
    pledgeId: '',
    amount: 0,
    currency: 'usd',
    paymentMethod: 'card'
  });

  const handleTestPayment = async () => {
    if (!testPayment.pledgeId || testPayment.amount <= 0) return;

    try {
      await processPayment(testPayment);
    } catch (error) {
      console.error('Test payment failed:', error);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Payment Processing Control
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Stats */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {paymentStats.totalProcessed}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Processed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(paymentStats.successRate * 100)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Test Payment Form */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Test Payment</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Pledge ID"
                value={testPayment.pledgeId}
                onChange={(e) => setTestPayment({ ...testPayment, pledgeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                placeholder="Amount (cents)"
                value={testPayment.amount}
                onChange={(e) => setTestPayment({ ...testPayment, amount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleTestPayment}
                disabled={!testPayment.pledgeId || testPayment.amount <= 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Process Test Payment
              </button>
            </div>
          </div>
        </div>

        {/* Active Payments */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Active Payments</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Array.from(activePayments.entries()).map(([pledgeId, payment]) => (
              <div key={pledgeId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {pledgeId}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    payment.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : payment.status === 'failed'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {payment.status}
                  </span>
                </div>
                {payment.metadata.verificationScore > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Verification: {Math.round(payment.metadata.verificationScore * 100)}%
                  </p>
                )}
              </div>
            ))}
            {activePayments.size === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No active payments
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Components
// ============================================================================

interface TaskStatusPanelProps {
  tasks: SwarmResult[];
}

function TaskStatusPanel({ tasks }: TaskStatusPanelProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Task Status</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.taskId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
            <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
              {task.taskId}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              task.status === 'completed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : task.status === 'failed'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {task.status}
            </span>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-2">No active tasks</p>
        )}
      </div>
    </div>
  );
}

interface CampaignResultsPanelProps {
  results: SwarmResult[];
}

function CampaignResultsPanel({ results }: CampaignResultsPanelProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Campaign Results</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {results.map((result) => (
          <div key={result.taskId} className="p-3 bg-white dark:bg-gray-600 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {result.taskId}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                result.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : result.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {result.status}
              </span>
            </div>
            {result.metadata.verificationScore > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Truth Score: {Math.round(result.metadata.verificationScore * 100)}%
              </div>
            )}
            {result.metadata.executionTime > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Execution Time: {result.metadata.executionTime}ms
              </div>
            )}
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-2">No results yet</p>
        )}
      </div>
    </div>
  );
}