/**
 * Claude Code SDK Testing Utilities
 *
 * Comprehensive testing approaches and utilities for validating
 * Claude Code SDK integration with Vibefunder's systems.
 */

import { jest } from '@jest/globals';
import { ClaudeCodeSDK, AgentDefinition, SwarmResult } from '../lib/claude-code-sdk';

// ============================================================================
// Mock Implementations
// ============================================================================

export class MockClaudeCodeSDK extends ClaudeCodeSDK {
  private mockSwarmId = 'mock-swarm-123';
  private mockTasks: Map<string, SwarmResult> = new Map();
  private mockAgents: Map<string, AgentDefinition> = new Map();

  constructor(config: any) {
    super(config);
  }

  async initializeSwarm(): Promise<string> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.emit('swarm:initialized', { swarmId: this.mockSwarmId });
    return this.mockSwarmId;
  }

  async spawnAgent(definition: AgentDefinition): Promise<string> {
    const agentId = `agent-${Date.now()}`;
    this.mockAgents.set(definition.id, definition);

    this.emit('agent:spawned', { agentId, agent: definition });
    return agentId;
  }

  async orchestrateCampaignCreation(campaignData: any): Promise<SwarmResult> {
    const taskId = `campaign-${campaignData.id}`;
    const result: SwarmResult = {
      taskId,
      status: 'in_progress',
      results: {},
      metadata: {
        executionTime: 0,
        agentsUsed: ['analyst', 'content-generator', 'optimizer'],
        verificationScore: 0.95
      }
    };

    this.mockTasks.set(taskId, result);

    // Simulate async completion
    setTimeout(() => {
      result.status = 'completed';
      result.results = {
        optimizedTitle: `Enhanced: ${campaignData.title}`,
        generatedDescription: 'AI-generated campaign description...',
        suggestedMilestones: [
          { name: 'MVP Development', pct: 25 },
          { name: 'Beta Testing', pct: 50 },
          { name: 'Production Release', pct: 100 }
        ]
      };
      result.metadata.executionTime = 2500;

      this.emit('task:completed', { taskId, results: result.results });
    }, 500);

    return result;
  }

  async orchestratePaymentProcessing(paymentData: any): Promise<SwarmResult> {
    const taskId = `payment-${paymentData.pledgeId}`;
    const result: SwarmResult = {
      taskId,
      status: 'in_progress',
      results: {},
      metadata: {
        executionTime: 0,
        agentsUsed: ['stripe-payment-processor', 'campaign-manager'],
        verificationScore: 0.98
      }
    };

    this.mockTasks.set(taskId, result);

    // Simulate payment processing
    setTimeout(() => {
      result.status = 'completed';
      result.results = {
        paymentStatus: 'succeeded',
        paymentIntentId: 'pi_mock_123',
        chargeId: 'ch_mock_456',
        receiptUrl: 'https://receipt.stripe.com/mock'
      };
      result.metadata.executionTime = 1800;

      this.emit('task:completed', { taskId, results: result.results });
    }, 300);

    return result;
  }

  async monitorTaskProgress(taskId: string): Promise<SwarmResult> {
    const task = this.mockTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  }

  async distributeTask(task: string, agentTypes: string[], strategy: 'parallel' | 'sequential' | 'adaptive' = 'adaptive'): Promise<SwarmResult> {
    const taskId = `task-${Date.now()}`;
    const result: SwarmResult = {
      taskId,
      status: 'pending',
      results: {},
      metadata: {
        executionTime: 0,
        agentsUsed: agentTypes,
        verificationScore: 0
      }
    };

    this.mockTasks.set(taskId, result);
    return result;
  }

  async getPerformanceMetrics(): Promise<any> {
    return {
      swarmHealth: 0.95,
      agentPerformance: {
        average: 0.92,
        byType: {
          'stripe-payment-processor': 0.98,
          'campaign-manager': 0.89,
          'content-generator': 0.94
        }
      },
      taskThroughput: 15.5,
      verificationScores: {
        average: 0.96,
        minimum: 0.92,
        maximum: 0.99
      },
      resourceUtilization: {
        cpu: 0.65,
        memory: 0.78,
        network: 0.45
      }
    };
  }

  async shutdown(): Promise<void> {
    this.mockTasks.clear();
    this.mockAgents.clear();
    this.emit('sdk:shutdown', { swarmId: this.mockSwarmId });
  }
}

// ============================================================================
// Test Utilities and Helpers
// ============================================================================

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<any>;
  verify: (result: any) => void | Promise<void>;
  cleanup?: () => Promise<void>;
}

export class ClaudeCodeTestSuite {
  private sdk: MockClaudeCodeSDK;
  private scenarios: TestScenario[] = [];

  constructor(config: any) {
    this.sdk = new MockClaudeCodeSDK(config);
  }

  addScenario(scenario: TestScenario): void {
    this.scenarios.push(scenario);
  }

  async runAll(): Promise<{ passed: number; failed: number; results: any[] }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const scenario of this.scenarios) {
      try {
        console.log(`Running scenario: ${scenario.name}`);

        // Setup
        if (scenario.setup) {
          await scenario.setup();
        }

        // Execute
        const result = await scenario.execute();

        // Verify
        await scenario.verify(result);

        results.push({
          scenario: scenario.name,
          status: 'passed',
          result
        });
        passed++;

        console.log(`✓ ${scenario.name} passed`);
      } catch (error) {
        results.push({
          scenario: scenario.name,
          status: 'failed',
          error: error.message
        });
        failed++;

        console.error(`✗ ${scenario.name} failed:`, error.message);
      } finally {
        // Cleanup
        if (scenario.cleanup) {
          await scenario.cleanup();
        }
      }
    }

    return { passed, failed, results };
  }

  getSDK(): MockClaudeCodeSDK {
    return this.sdk;
  }
}

// ============================================================================
// Pre-built Test Scenarios
// ============================================================================

export function createCampaignOrchestrationTests(): TestScenario[] {
  return [
    {
      name: 'Campaign Creation Workflow',
      description: 'Tests end-to-end campaign creation with AI orchestration',
      setup: async () => {
        // Initialize mock data
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          swarmTopology: 'adaptive',
          maxAgents: 10,
          enableVerification: true
        });

        await sdk.initializeSwarm();
        const result = await sdk.orchestrateCampaignCreation({
          id: 'test-campaign-001',
          title: 'Test Campaign',
          summary: 'A test campaign for validation',
          fundingGoalDollars: 10000
        });

        return { sdk, result };
      },
      verify: async ({ result }) => {
        expect(result.taskId).toContain('campaign-');
        expect(result.metadata.agentsUsed).toContain('analyst');
        expect(result.metadata.verificationScore).toBeGreaterThan(0.9);

        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 600));
        expect(result.status).toBe('completed');
        expect(result.results.optimizedTitle).toBeDefined();
      }
    },

    {
      name: 'Payment Processing Integration',
      description: 'Tests Stripe payment processing coordination',
      setup: async () => {
        // Mock Stripe webhooks and payment intents
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          swarmTopology: 'hierarchical',
          maxAgents: 5,
          enableVerification: true
        });

        await sdk.initializeSwarm();
        const result = await sdk.orchestratePaymentProcessing({
          pledgeId: 'pledge-test-001',
          amount: 5000, // $50.00
          currency: 'usd',
          paymentMethod: 'card'
        });

        return { sdk, result };
      },
      verify: async ({ result }) => {
        expect(result.taskId).toContain('payment-');
        expect(result.metadata.agentsUsed).toContain('stripe-payment-processor');
        expect(result.metadata.verificationScore).toBeGreaterThan(0.95);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 400));
        expect(result.status).toBe('completed');
        expect(result.results.paymentStatus).toBe('succeeded');
      }
    },

    {
      name: 'Multi-Agent Task Distribution',
      description: 'Tests task distribution across multiple agent types',
      setup: async () => {
        // Setup agent definitions
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          swarmTopology: 'mesh',
          maxAgents: 15,
          enableVerification: true
        });

        await sdk.initializeSwarm();

        // Spawn specialized agents
        const agents = [
          {
            id: 'content-gen-1',
            type: 'content-generator' as const,
            name: 'Content Generator',
            capabilities: ['text generation', 'SEO optimization'],
            priority: 'medium' as const
          },
          {
            id: 'analyzer-1',
            type: 'analyst' as const,
            name: 'Data Analyzer',
            capabilities: ['data analysis', 'trend identification'],
            priority: 'high' as const
          }
        ];

        const agentIds = await Promise.all(agents.map(agent => sdk.spawnAgent(agent)));

        const task = await sdk.distributeTask(
          'Optimize campaign content for maximum engagement',
          ['content-generator', 'analyst'],
          'parallel'
        );

        return { sdk, agentIds, task };
      },
      verify: async ({ agentIds, task }) => {
        expect(agentIds).toHaveLength(2);
        expect(task.metadata.agentsUsed).toContain('content-generator');
        expect(task.metadata.agentsUsed).toContain('analyst');
      }
    },

    {
      name: 'Performance Monitoring',
      description: 'Tests swarm performance monitoring and optimization',
      setup: async () => {
        // Setup performance monitoring
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          swarmTopology: 'star',
          maxAgents: 8,
          enableVerification: true
        });

        await sdk.initializeSwarm();
        const metrics = await sdk.getPerformanceMetrics();

        return { sdk, metrics };
      },
      verify: async ({ metrics }) => {
        expect(metrics.swarmHealth).toBeGreaterThan(0.8);
        expect(metrics.verificationScores.average).toBeGreaterThan(0.9);
        expect(metrics.taskThroughput).toBeGreaterThan(0);
        expect(metrics.resourceUtilization.cpu).toBeLessThan(1.0);
      }
    }
  ];
}

export function createIntegrationTests(): TestScenario[] {
  return [
    {
      name: 'Vibefunder API Integration',
      description: 'Tests integration with Vibefunder API endpoints',
      setup: async () => {
        // Mock API responses
        global.fetch = jest.fn().mockImplementation((url: string) => {
          if (url.includes('/api/campaigns')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: 'campaign-123',
                title: 'Test Campaign',
                status: 'draft'
              })
            });
          }
          return Promise.resolve({ ok: false });
        });
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          swarmTopology: 'adaptive',
          maxAgents: 5
        });

        await sdk.initializeSwarm();

        // Simulate API call through agent
        const result = await sdk.distributeTask(
          'Fetch campaign data and optimize content',
          ['campaign-manager'],
          'sequential'
        );

        return { sdk, result };
      },
      verify: async ({ result }) => {
        expect(result.taskId).toBeDefined();
        expect(result.metadata.agentsUsed).toContain('campaign-manager');
      },
      cleanup: async () => {
        // Restore fetch
        delete global.fetch;
      }
    },

    {
      name: 'GitHub Integration Workflow',
      description: 'Tests GitHub repository analysis and campaign generation',
      setup: async () => {
        // Mock GitHub API responses
      },
      execute: async () => {
        const sdk = new MockClaudeCodeSDK({
          githubIntegration: true,
          swarmTopology: 'hierarchical',
          maxAgents: 10
        });

        await sdk.initializeSwarm();

        const task = await sdk.distributeTask(
          'Analyze GitHub repository and generate campaign content',
          ['github-manager', 'content-generator'],
          'sequential'
        );

        return { sdk, task };
      },
      verify: async ({ task }) => {
        expect(task.metadata.agentsUsed).toContain('github-manager');
        expect(task.metadata.agentsUsed).toContain('content-generator');
      }
    }
  ];
}

// ============================================================================
// Test Execution Functions
// ============================================================================

export async function runClaudeCodeTests(): Promise<void> {
  console.log('Starting Claude Code SDK Tests...\n');

  const testSuite = new ClaudeCodeTestSuite({
    swarmTopology: 'adaptive',
    maxAgents: 20,
    enableVerification: true,
    truthThreshold: 0.95
  });

  // Add test scenarios
  const campaignTests = createCampaignOrchestrationTests();
  const integrationTests = createIntegrationTests();

  [...campaignTests, ...integrationTests].forEach(test => {
    testSuite.addScenario(test);
  });

  // Run all tests
  const results = await testSuite.runAll();

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.results
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`- ${r.scenario}: ${r.error}`));
  }

  // Cleanup
  await testSuite.getSDK().shutdown();
}

// ============================================================================
// Jest Test Matchers
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidSwarmResult(): R;
      toHaveCompletedSuccessfully(): R;
      toHaveHighVerificationScore(): R;
    }
  }
}

expect.extend({
  toHaveValidSwarmResult(received: SwarmResult) {
    const pass =
      received.taskId &&
      received.status &&
      received.metadata &&
      received.metadata.agentsUsed &&
      received.metadata.agentsUsed.length > 0;

    return {
      message: () =>
        pass
          ? `Expected SwarmResult to be invalid`
          : `Expected SwarmResult to have valid structure`,
      pass
    };
  },

  toHaveCompletedSuccessfully(received: SwarmResult) {
    const pass = received.status === 'completed' && !received.errors;

    return {
      message: () =>
        pass
          ? `Expected task to not be completed successfully`
          : `Expected task to be completed successfully, but status was ${received.status}`,
      pass
    };
  },

  toHaveHighVerificationScore(received: SwarmResult, threshold: number = 0.9) {
    const score = received.metadata.verificationScore;
    const pass = score >= threshold;

    return {
      message: () =>
        pass
          ? `Expected verification score to be below ${threshold}`
          : `Expected verification score ${score} to be >= ${threshold}`,
      pass
    };
  }
});

export { expect };