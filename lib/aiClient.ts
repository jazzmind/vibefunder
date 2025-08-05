import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

/**
 * Shared OpenAI client configuration with consistent settings
 * Used across all AI services to prevent duplicate initialization
 */
class AIClientSingleton {
  private static instance: OpenAI | null = null;
  private static initialized = false;

  /**
   * Get the shared OpenAI client instance
   */
  static getInstance(): OpenAI {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance!;
  }

  /**
   * Initialize the OpenAI client with standard configuration
   */
  private static initialize(): void {
    if (this.initialized) return;

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('Warning: OPENAI_API_KEY is not set in environment variables');
    }

    this.instance = new OpenAI({
      apiKey: apiKey || '',
      timeout: 120000, // 2 minutes - increased for complex operations
      maxRetries: 3,   // Built-in retry logic
      defaultHeaders: {
        'User-Agent': 'ProposalHub-AI/1.0',
      },
    });

    this.initialized = true;
    console.log('✅ AI Client initialized with shared configuration');
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.initialized = false;
  }

  /**
   * Check if the client is properly configured
   */
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  }

  /**
   * Get client configuration info (for debugging)
   */
  static getConfig(): {
    hasApiKey: boolean;
    timeout: number;
    maxRetries: number;
  } {
    return {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      timeout: 120000,
      maxRetries: 3,
    };
  }
}

/**
 * Export the shared OpenAI client instance
 * Use this instead of creating new OpenAI instances in individual files
 */
export const aiClient = AIClientSingleton.getInstance();

/**
 * Export utility functions for advanced use cases
 */
export const AIClient = {
  getInstance: () => AIClientSingleton.getInstance(),
  isConfigured: () => AIClientSingleton.isConfigured(),
  getConfig: () => AIClientSingleton.getConfig(),
  reset: () => AIClientSingleton.reset(),
};

export default aiClient; 