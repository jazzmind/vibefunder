/**
 * Service Test Helpers
 * 
 * Common utilities and mocks for testing service layer functionality
 */

import { AIError, AIErrorType } from '@/lib/ai/aiService';

/**
 * Mock AI client for testing AI service functionality
 */
export const mockAIClient = {
  responses: {
    parse: jest.fn(),
  },
  images: {
    generate: jest.fn(),
  },
};

/**
 * Helper to create mock AI responses
 */
export function createMockAIResponse<T>(data: T, metadata?: any) {
  return {
    output_parsed: data,
    usage: {
      total_tokens: metadata?.tokensUsed || 150,
    },
    model: metadata?.model || 'gpt-4',
    ...metadata,
  };
}

/**
 * Helper to create AI error for testing error scenarios
 */
export function createAIError(
  type: AIErrorType = AIErrorType.API_ERROR,
  message: string = 'Test AI error',
  retryable: boolean = false
): AIError {
  return new AIError(type, message, undefined, retryable);
}

/**
 * Mock fetch for GitHub API testing
 */
export function mockFetch(responses: { [url: string]: any }) {
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
    // Check if URL matches any of our mock responses
    for (const [mockUrl, mockResponse] of Object.entries(responses)) {
      if (url.includes(mockUrl) || url === mockUrl) {
        return Promise.resolve({
          ok: mockResponse.ok !== false,
          status: mockResponse.status || 200,
          json: () => Promise.resolve(mockResponse.data || mockResponse),
          text: () => Promise.resolve(JSON.stringify(mockResponse.data || mockResponse)),
        });
      }
    }
    
    // Default to 404 for unmocked URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not Found' }),
    });
  });
  
  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Mock GitHub repository data for testing
 */
export const mockGitHubRepo = {
  name: 'test-repo',
  full_name: 'testuser/test-repo',
  description: 'A test repository for unit testing',
  html_url: 'https://github.com/testuser/test-repo',
  default_branch: 'main',
  language: 'TypeScript',
  topics: ['typescript', 'testing', 'jest'],
};

/**
 * Mock GitHub file content for testing
 */
export const mockReadmeContent = `# Test Repository

This is a test repository for demonstrating our awesome project.

## Features

- Feature A: Does something amazing
- Feature B: Solves real problems
- Feature C: Easy to use

## Installation

\`\`\`bash
npm install test-repo
\`\`\`

## Usage

\`\`\`typescript
import { TestRepo } from 'test-repo';

const repo = new TestRepo();
repo.doSomething();
\`\`\`

## Contributing

We welcome contributions! Please see our contributing guide.

## License

MIT License`;

/**
 * Mock campaign generation input for testing
 */
export const mockCampaignInput = {
  repository: mockGitHubRepo,
  readmeContent: mockReadmeContent,
  docsContent: [
    '## API Documentation\n\nThis is the API documentation for the test repository.',
    '## Contributing Guide\n\nHere\'s how to contribute to this project.',
  ],
  userPrompt: 'Create a campaign for a developer tool that helps with testing',
};

/**
 * Mock generated campaign data
 */
export const mockGeneratedCampaign = {
  title: 'Revolutionary Testing Tool for Developers',
  summary: 'Streamline your testing workflow with our innovative TypeScript testing framework',
  description: 'A comprehensive testing solution that makes writing and running tests effortless for developers of all skill levels.',
  fundingGoalDollars: 25000,
  sectors: ['Developer Tools', 'Software Development', 'Testing'],
  deployModes: ['npm package', 'CLI tool', 'VS Code extension'],
  tags: ['typescript', 'testing', 'developer-tools', 'productivity', 'automation'],
  milestones: [
    {
      name: 'Core Framework Development',
      pct: 30,
      dueDate: '3 months',
      acceptance: {
        criteria: 'Complete core testing framework with basic functionality',
        deliverables: ['Core library', 'Basic API', 'Documentation']
      }
    },
    {
      name: 'Advanced Features',
      pct: 40,
      dueDate: '6 months',
      acceptance: {
        criteria: 'Add advanced testing features and integrations',
        deliverables: ['Advanced API', 'IDE integrations', 'Plugin system']
      }
    },
    {
      name: 'Release and Support',
      pct: 30,
      dueDate: '9 months',
      acceptance: {
        criteria: 'Production-ready release with full documentation',
        deliverables: ['v1.0 release', 'Complete documentation', 'Community support']
      }
    }
  ],
  pledgeTiers: [
    {
      title: 'Supporter',
      description: 'Help us build the future of testing tools',
      amountDollars: 25,
      order: 1,
      estimatedDelivery: 'Digital thank you and updates'
    },
    {
      title: 'Early Adopter',
      description: 'Get early access to the testing framework',
      amountDollars: 100,
      order: 2,
      estimatedDelivery: 'Beta access 2 weeks before public release'
    },
    {
      title: 'Professional License',
      description: 'Commercial license with priority support',
      amountDollars: 500,
      order: 3,
      estimatedDelivery: 'Commercial license and 1 year priority support'
    }
  ]
};

/**
 * Mock content enhancement suggestions
 */
export const mockContentSuggestions = {
  suggestions: [
    {
      type: 'addition' as const,
      section: 'Project Description',
      originalText: 'A comprehensive testing solution',
      enhancedText: 'A comprehensive, AI-powered testing solution that reduces testing time by 70%',
      reason: 'Adding specific benefits and metrics makes the value proposition more compelling'
    },
    {
      type: 'modification' as const,
      section: 'Target Audience',
      originalText: 'developers of all skill levels',
      enhancedText: 'frontend and backend developers, QA engineers, and DevOps teams',
      reason: 'More specific targeting helps potential backers understand if this is for them'
    }
  ]
};

/**
 * Helper to simulate timeout in tests
 */
export function simulateTimeout(delay: number = 100): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AIError(AIErrorType.TIMEOUT, `Operation timed out after ${delay}ms`));
    }, delay);
  });
}

/**
 * Helper to simulate rate limiting
 */
export function simulateRateLimit(): Promise<never> {
  return Promise.reject(
    new AIError(
      AIErrorType.RATE_LIMIT, 
      'Rate limit exceeded. Please try again later.',
      undefined,
      true // retryable
    )
  );
}

/**
 * Helper to create consistent test environment variables
 */
export function setupTestEnvironment() {
  const originalEnv = process.env;
  
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    AI_TEST_MODE: 'true',
    AI_TEST_SESSION_ID: 'test-session-123',
  };
  
  return () => {
    process.env = originalEnv;
  };
}

/**
 * Helper to verify Zod schema validation
 */
export function expectValidationError(fn: () => any, expectedMessage?: string) {
  try {
    fn();
    throw new Error('Expected validation to throw an error');
  } catch (error) {
    expect(error).toBeDefined();
    if (expectedMessage) {
      expect(error.message || error.toString()).toContain(expectedMessage);
    }
  }
}