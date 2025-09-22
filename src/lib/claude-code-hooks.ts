/**
 * Claude Code React Hooks for Vibefunder
 *
 * Custom hooks providing React integration patterns for Claude Code SDK
 * with specific focus on Vibefunder's campaign management and payment processing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClaudeCodeSDK, AgentDefinition, SwarmResult } from './claude-code-sdk';

// ============================================================================
// Core Hooks
// ============================================================================

export function useClaudeCodeSwarm(config: any) {
  const [sdk] = useState(() => new ClaudeCodeSDK(config));
  const [swarmId, setSwarmId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);

  useEffect(() => {
    let mounted = true;

    const initializeSwarm = async () => {
      try {
        const id = await sdk.initializeSwarm();
        if (mounted) {
          setSwarmId(id);
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize swarm');
        }
      }
    };

    initializeSwarm();

    // Setup event listeners
    const handleSwarmError = (event: any) => {
      if (mounted) setError(event.error);
    };

    const handleAgentSpawned = (event: any) => {
      if (mounted) {
        setAgents(prev => [...prev, event.agent]);
      }
    };

    sdk.on('swarm:error', handleSwarmError);
    sdk.on('agent:spawned', handleAgentSpawned);

    return () => {
      mounted = false;
      sdk.removeListener('swarm:error', handleSwarmError);
      sdk.removeListener('agent:spawned', handleAgentSpawned);
      sdk.shutdown();
    };
  }, [sdk]);

  const spawnAgent = useCallback(async (definition: AgentDefinition) => {
    try {
      await sdk.spawnAgent(definition);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    }
  }, [sdk]);

  const spawnSpecializedAgents = useCallback(async () => {
    try {
      await sdk.spawnSpecializedAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn specialized agents');
    }
  }, [sdk]);

  return {
    sdk,
    swarmId,
    isInitialized,
    error,
    agents,
    spawnAgent,
    spawnSpecializedAgents
  };
}

// ============================================================================
// Campaign Management Hooks
// ============================================================================

export function useCampaignOrchestration(sdk: ClaudeCodeSDK) {
  const [activeCampaigns, setActiveCampaigns] = useState<Map<string, SwarmResult>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  const createCampaign = useCallback(async (campaignData: any) => {
    setIsProcessing(true);
    try {
      const result = await sdk.orchestrateCampaignCreation(campaignData);
      setActiveCampaigns(prev => new Map(prev).set(campaignData.id, result));
      return result;
    } catch (error) {
      console.error('Campaign orchestration failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [sdk]);

  const optimizeCampaign = useCallback(async (campaignId: string, optimizationGoals: string[]) => {
    setIsProcessing(true);
    try {
      const task = await sdk.distributeTask(
        `Optimize campaign ${campaignId} with goals: ${optimizationGoals.join(', ')}`,
        ['optimizer', 'analyst', 'content-generator'],
        'adaptive'
      );

      setActiveCampaigns(prev => new Map(prev).set(`${campaignId}-optimization`, task));
      return task;
    } catch (error) {
      console.error('Campaign optimization failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [sdk]);

  const generateCampaignContent = useCallback(async (campaignId: string, contentType: 'description' | 'milestones' | 'stretch-goals') => {
    try {
      const task = await sdk.distributeTask(
        `Generate ${contentType} content for campaign ${campaignId}`,
        ['content-generator', 'analyst'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Content generation failed:', error);
      throw error;
    }
  }, [sdk]);

  return {
    activeCampaigns,
    isProcessing,
    createCampaign,
    optimizeCampaign,
    generateCampaignContent
  };
}

// ============================================================================
// Payment Processing Hooks
// ============================================================================

export function usePaymentProcessing(sdk: ClaudeCodeSDK) {
  const [activePayments, setActivePayments] = useState<Map<string, SwarmResult>>(new Map());
  const [paymentStats, setPaymentStats] = useState({
    totalProcessed: 0,
    successRate: 0,
    averageProcessingTime: 0
  });

  const processPayment = useCallback(async (paymentData: any) => {
    try {
      const result = await sdk.orchestratePaymentProcessing(paymentData);
      setActivePayments(prev => new Map(prev).set(paymentData.pledgeId, result));

      // Update stats
      setPaymentStats(prev => ({
        ...prev,
        totalProcessed: prev.totalProcessed + 1
      }));

      return result;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }, [sdk]);

  const validatePaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      const task = await sdk.distributeTask(
        `Validate payment method ${paymentMethodId}`,
        ['stripe-payment-processor'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Payment validation failed:', error);
      throw error;
    }
  }, [sdk]);

  const handlePaymentWebhook = useCallback(async (webhookData: any) => {
    try {
      const task = await sdk.distributeTask(
        `Process Stripe webhook: ${webhookData.type}`,
        ['stripe-payment-processor', 'campaign-manager'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }, [sdk]);

  return {
    activePayments,
    paymentStats,
    processPayment,
    validatePaymentMethod,
    handlePaymentWebhook
  };
}

// ============================================================================
// Real-time Task Monitoring Hook
// ============================================================================

export function useTaskMonitoring(sdk: ClaudeCodeSDK) {
  const [tasks, setTasks] = useState<Map<string, SwarmResult>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const monitorTask = useCallback(async (taskId: string) => {
    try {
      const result = await sdk.monitorTaskProgress(taskId);
      setTasks(prev => new Map(prev).set(taskId, result));
      return result;
    } catch (error) {
      console.error('Task monitoring failed:', error);
      throw error;
    }
  }, [sdk]);

  const startMonitoring = useCallback((taskIds: string[], intervalMs: number = 5000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      for (const taskId of taskIds) {
        try {
          await monitorTask(taskId);
        } catch (error) {
          console.error(`Failed to monitor task ${taskId}:`, error);
        }
      }
    }, intervalMs);
  }, [monitorTask]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    tasks,
    monitorTask,
    startMonitoring,
    stopMonitoring
  };
}

// ============================================================================
// Context Management Hook
// ============================================================================

export function useCollaborationContext(sdk: ClaudeCodeSDK, sessionId: string) {
  const [participants, setParticipants] = useState<string[]>([]);
  const [sharedContext, setSharedContext] = useState<Record<string, any>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeContext = async () => {
      try {
        // Retrieve existing participants
        const existingParticipants = await sdk.retrieveContext(sessionId, 'participants');
        setParticipants(existingParticipants || []);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize collaboration context:', error);
      }
    };

    initializeContext();
  }, [sdk, sessionId]);

  const addParticipant = useCallback(async (participantId: string) => {
    const updatedParticipants = [...participants, participantId];
    setParticipants(updatedParticipants);

    try {
      await sdk.shareContext(sessionId, 'participants', updatedParticipants);
    } catch (error) {
      console.error('Failed to add participant:', error);
      // Revert on error
      setParticipants(participants);
    }
  }, [sdk, sessionId, participants]);

  const shareData = useCallback(async (key: string, data: any) => {
    setSharedContext(prev => ({ ...prev, [key]: data }));

    try {
      await sdk.shareContext(sessionId, key, data);
    } catch (error) {
      console.error('Failed to share context:', error);
      // Revert on error
      setSharedContext(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  }, [sdk, sessionId]);

  const retrieveData = useCallback(async (key: string) => {
    try {
      const data = await sdk.retrieveContext(sessionId, key);
      setSharedContext(prev => ({ ...prev, [key]: data }));
      return data;
    } catch (error) {
      console.error('Failed to retrieve context:', error);
      return null;
    }
  }, [sdk, sessionId]);

  return {
    participants,
    sharedContext,
    isInitialized,
    addParticipant,
    shareData,
    retrieveData
  };
}

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

export function usePerformanceMonitoring(sdk: ClaudeCodeSDK) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const getMetrics = useCallback(async () => {
    try {
      const currentMetrics = await sdk.getPerformanceMetrics();
      setMetrics(currentMetrics);
      return currentMetrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }, [sdk]);

  const optimizePerformance = useCallback(async () => {
    setIsOptimizing(true);
    try {
      await sdk.optimizeSwarmPerformance();
      // Refresh metrics after optimization
      await getMetrics();
    } catch (error) {
      console.error('Performance optimization failed:', error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [sdk, getMetrics]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(getMetrics, 30000);
    return () => clearInterval(interval);
  }, [getMetrics]);

  return {
    metrics,
    isOptimizing,
    getMetrics,
    optimizePerformance
  };
}

// ============================================================================
// GitHub Integration Hook
// ============================================================================

export function useGitHubIntegration(sdk: ClaudeCodeSDK) {
  const [repositories, setRepositories] = useState<any[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<'connected' | 'disconnected' | 'pending'>('disconnected');

  const analyzeRepository = useCallback(async (repoUrl: string) => {
    try {
      const task = await sdk.distributeTask(
        `Analyze repository for campaign integration: ${repoUrl}`,
        ['github-manager', 'analyst'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw error;
    }
  }, [sdk]);

  const generateCampaignFromRepo = useCallback(async (repoUrl: string) => {
    try {
      const task = await sdk.distributeTask(
        `Generate campaign content from repository: ${repoUrl}`,
        ['content-generator', 'analyst', 'github-manager'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Campaign generation from repo failed:', error);
      throw error;
    }
  }, [sdk]);

  const setupWebhooks = useCallback(async (repoUrl: string, webhookUrl: string) => {
    try {
      const task = await sdk.distributeTask(
        `Setup GitHub webhooks for repository: ${repoUrl}`,
        ['github-manager'],
        'sequential'
      );

      return task;
    } catch (error) {
      console.error('Webhook setup failed:', error);
      throw error;
    }
  }, [sdk]);

  return {
    repositories,
    integrationStatus,
    analyzeRepository,
    generateCampaignFromRepo,
    setupWebhooks
  };
}

// ============================================================================
// Error Recovery Hook
// ============================================================================

export function useErrorRecovery(sdk: ClaudeCodeSDK) {
  const [errors, setErrors] = useState<Array<{ id: string, error: string, timestamp: Date, resolved: boolean }>>([]);

  const reportError = useCallback((error: string) => {
    const errorEntry = {
      id: `error-${Date.now()}`,
      error,
      timestamp: new Date(),
      resolved: false
    };

    setErrors(prev => [...prev, errorEntry]);

    // Emit error for SDK to handle
    sdk.emit('error:reported', errorEntry);
  }, [sdk]);

  const resolveError = useCallback((errorId: string) => {
    setErrors(prev => prev.map(err =>
      err.id === errorId ? { ...err, resolved: true } : err
    ));
  }, []);

  const clearResolvedErrors = useCallback(() => {
    setErrors(prev => prev.filter(err => !err.resolved));
  }, []);

  useEffect(() => {
    const handleSwarmError = (event: any) => {
      reportError(`Swarm error: ${event.error}`);
    };

    const handleTaskError = (event: any) => {
      reportError(`Task error: ${event.error}`);
    };

    const handleAgentError = (event: any) => {
      reportError(`Agent error: ${event.error}`);
    };

    sdk.on('swarm:error', handleSwarmError);
    sdk.on('task:error', handleTaskError);
    sdk.on('agent:error', handleAgentError);

    return () => {
      sdk.removeListener('swarm:error', handleSwarmError);
      sdk.removeListener('task:error', handleTaskError);
      sdk.removeListener('agent:error', handleAgentError);
    };
  }, [sdk, reportError]);

  return {
    errors,
    reportError,
    resolveError,
    clearResolvedErrors,
    unresolvedCount: errors.filter(err => !err.resolved).length
  };
}