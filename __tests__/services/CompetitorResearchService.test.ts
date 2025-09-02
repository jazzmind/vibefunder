/**
 * CompetitorResearchService Tests
 * 
 * Comprehensive tests for competitor research service covering:
 * - Perplexity search integration
 * - Input validation and sanitization
 * - Error handling and retry logic
 * - Content analysis and processing
 * - Network failures and timeout scenarios
 */

import { CompetitorResearchService } from '@/lib/services/CompetitorResearchService';
import { searchPerplexity } from '@/lib/ai/search/base';
import { MODELS } from '@/lib/ai/models';
import {
  setupTestEnvironment,
  simulateTimeout,
  simulateRateLimit,
  mockAIClient
} from '../lib/serviceTestHelpers';

// Mock the Perplexity search function
jest.mock('@/lib/ai/search/base', () => ({
  searchPerplexity: jest.fn()
}));

const mockSearchPerplexity = searchPerplexity as jest.MockedFunction<typeof searchPerplexity>;

describe('CompetitorResearchService', () => {
  let service: CompetitorResearchService;
  let restoreEnv: () => void;

  const mockResearchResult = `## Competitor Analysis

### Direct Competitors
1. **CompetitorA** - Focus: Enterprise solutions, Differentiator: Advanced analytics
2. **CompetitorB** - Focus: Small business, Differentiator: Easy setup

### Market Gaps
- Lack of mid-market solutions
- Limited customization options
- Poor mobile experience

### Key Opportunities
- AI-powered insights
- Better user experience
- Competitive pricing model`;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new CompetitorResearchService();
    jest.clearAllMocks();
    
    // Reset AI client mocks
    mockAIClient.responses.parse.mockClear();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('research method', () => {
    it('should conduct competitor research with product description only', async () => {
      // Arrange
      const productDescription = 'Revolutionary AI-powered project management tool for developer teams';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      expect(mockSearchPerplexity).toHaveBeenCalledWith(
        MODELS.perplexity,
        'You are a market analyst. Return concise competitor/alternative overview with key differentiators and notable gaps.',
        expect.stringContaining('Revolutionary AI-powered project management tool')
      );
    });

    it('should conduct research with both product description and website URL', async () => {
      // Arrange
      const productDescription = 'Advanced analytics dashboard for e-commerce businesses';
      const websiteUrl = 'https://example.com';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, websiteUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      expect(mockSearchPerplexity).toHaveBeenCalledWith(
        MODELS.perplexity,
        expect.stringContaining('market analyst'),
        expect.stringContaining('https://example.com')
      );

      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Product description: Advanced analytics dashboard');
      expect(userPrompt).toContain('Website: https://example.com');
    });

    it('should handle missing website URL gracefully', async () => {
      // Arrange
      const productDescription = 'Mobile fitness tracking application';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Website: n/a');
    });

    it('should handle undefined website URL', async () => {
      // Arrange
      const productDescription = 'Cloud storage solution for teams';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, undefined);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Website: n/a');
    });
  });

  describe('system prompt configuration', () => {
    it('should use appropriate system message for market analysis', async () => {
      // Arrange
      const productDescription = 'Test product';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      await service.research(productDescription);

      // Assert
      const [, systemMessage] = mockSearchPerplexity.mock.calls[0];
      expect(systemMessage).toContain('market analyst');
      expect(systemMessage).toContain('competitor/alternative overview');
      expect(systemMessage).toContain('key differentiators');
      expect(systemMessage).toContain('notable gaps');
      expect(systemMessage).toContain('concise');
    });

    it('should construct comprehensive user prompt', async () => {
      // Arrange
      const productDescription = 'Innovative blockchain payment processor';
      const websiteUrl = 'https://crypto-payments.com';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      await service.research(productDescription, websiteUrl);

      // Assert
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Product description:');
      expect(userPrompt).toContain('Website:');
      expect(userPrompt).toContain('Find close competitors');
      expect(userPrompt).toContain('summarize their focus');
      expect(userPrompt).toContain('key differentiators and gaps');
    });
  });

  describe('error handling', () => {
    it('should handle Perplexity search errors', async () => {
      // Arrange
      const productDescription = 'Test product';
      const searchError = new Error('Perplexity API error');
      mockSearchPerplexity.mockRejectedValue(searchError);

      // Act & Assert
      await expect(service.research(productDescription))
        .rejects.toThrow('Perplexity API error');
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const productDescription = 'Test product';
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockSearchPerplexity.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.research(productDescription))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const productDescription = 'Test product';
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockSearchPerplexity.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(service.research(productDescription))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle API unavailable errors', async () => {
      // Arrange
      const productDescription = 'Test product';
      const apiError = new Error('Service unavailable');
      apiError.name = 'ServiceUnavailableError';
      mockSearchPerplexity.mockRejectedValue(apiError);

      // Act & Assert
      await expect(service.research(productDescription))
        .rejects.toThrow('Service unavailable');
    });

    it('should handle empty search results gracefully', async () => {
      // Arrange
      const productDescription = 'Very niche product with no competitors';
      mockSearchPerplexity.mockResolvedValue('');

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe('');
    });

    it('should handle malformed search responses', async () => {
      // Arrange
      const productDescription = 'Test product';
      mockSearchPerplexity.mockResolvedValue(null as any);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBeNull();
    });
  });

  describe('input validation and sanitization', () => {
    it('should handle empty product description', async () => {
      // Arrange
      const productDescription = '';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Product description: ');
    });

    it('should handle very long product descriptions', async () => {
      // Arrange
      const longDescription = 'A'.repeat(10000);
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(longDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      expect(mockSearchPerplexity).toHaveBeenCalled();
    });

    it('should handle special characters in product description', async () => {
      // Arrange
      const specialCharsDescription = 'Product with émojis 🚀 & special chars <>&"';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(specialCharsDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('émojis 🚀 & special chars');
    });

    it('should handle invalid URLs gracefully', async () => {
      // Arrange
      const productDescription = 'Test product';
      const invalidUrl = 'not-a-valid-url';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, invalidUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Website: not-a-valid-url');
    });

    it('should handle URLs with special characters', async () => {
      // Arrange
      const productDescription = 'Test product';
      const specialUrl = 'https://example.com/path?param=value&other=test#section';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, specialUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain(specialUrl);
    });
  });

  describe('different product types', () => {
    it('should research SaaS products', async () => {
      // Arrange
      const saasDescription = 'Cloud-based CRM solution for sales teams with AI-powered lead scoring';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(saasDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('CRM solution');
      expect(userPrompt).toContain('AI-powered lead scoring');
    });

    it('should research mobile applications', async () => {
      // Arrange
      const mobileDescription = 'iOS and Android app for meditation and mindfulness with guided sessions';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(mobileDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('iOS and Android app');
      expect(userPrompt).toContain('meditation and mindfulness');
    });

    it('should research hardware products', async () => {
      // Arrange
      const hardwareDescription = 'Smart home security camera with facial recognition and cloud storage';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(hardwareDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Smart home security camera');
      expect(userPrompt).toContain('facial recognition');
    });

    it('should research developer tools', async () => {
      // Arrange
      const devToolDescription = 'Code review automation tool with AI-powered bug detection and performance analysis';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(devToolDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain('Code review automation');
      expect(userPrompt).toContain('AI-powered bug detection');
    });
  });

  describe('response content analysis', () => {
    it('should return structured competitor analysis', async () => {
      // Arrange
      const productDescription = 'Test product';
      const structuredResult = `## Competitive Landscape Analysis

### Primary Competitors
1. **MarketLeader** - 40% market share, enterprise focus
2. **Challenger** - 25% market share, mid-market specialist

### Emerging Players
- StartupA: AI-first approach
- StartupB: Mobile-only strategy

### Market Gaps Identified
- Limited API integrations
- Poor onboarding experience
- Lack of real-time collaboration

### Differentiation Opportunities
- Advanced analytics dashboard
- White-label solutions
- Multi-tenant architecture`;
      
      mockSearchPerplexity.mockResolvedValue(structuredResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(structuredResult);
      expect(result.content).toContain('Competitive Landscape');
      expect(result.content).toContain('Market Gaps');
      expect(result.content).toContain('Differentiation Opportunities');
    });

    it('should handle minimal competitor analysis results', async () => {
      // Arrange
      const productDescription = 'Highly specialized niche product';
      const minimalResult = 'Limited direct competitors found. Market appears underserved with potential for first-mover advantage.';
      mockSearchPerplexity.mockResolvedValue(minimalResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(minimalResult);
      expect(result.content).toContain('Limited direct competitors');
    });

    it('should handle comprehensive market analysis results', async () => {
      // Arrange
      const productDescription = 'Popular product category';
      const comprehensiveResult = `# Comprehensive Market Analysis\n\n## Direct Competitors (10+ identified)\n\n### Tier 1 (Enterprise)\n1. **EnterpriseLeader** - $100M+ ARR\n2. **CorporateGiant** - Global presence\n\n### Tier 2 (Mid-Market)\n3. **GrowthCompany** - Rapid expansion\n4. **RegionalPlayer** - Strong local presence\n\n### Tier 3 (SMB)\n5. **SmallBizTool** - Affordable pricing\n6. **FreemiumOption** - Freemium model\n\n## Indirect Competitors\n- Legacy solutions\n- DIY approaches\n- Alternative workflows\n\n## Market Dynamics\n- Growing at 15% CAGR\n- Increasing automation demand\n- Shift to cloud-based solutions\n\n## Key Success Factors\n- Integration capabilities\n- User experience\n- Scalability\n- Customer support\n\n## Opportunities\n- AI/ML integration\n- Vertical specialization\n- International expansion`;
      
      mockSearchPerplexity.mockResolvedValue(comprehensiveResult);

      // Act
      const result = await service.research(productDescription);

      // Assert
      expect(result.content).toBe(comprehensiveResult);
      expect(result.content).toContain('Comprehensive Market Analysis');
      expect(result.content).toContain('Market Dynamics');
      expect(result.content).toContain('Key Success Factors');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle whitespace-only product descriptions', async () => {
      // Arrange
      const whitespaceDescription = '   \n\t   ';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(whitespaceDescription);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      expect(mockSearchPerplexity).toHaveBeenCalled();
    });

    it('should handle URLs with encoded characters', async () => {
      // Arrange
      const productDescription = 'Test product';
      const encodedUrl = 'https://example.com/search?q=test%20product&category=tech';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, encodedUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain(encodedUrl);
    });

    it('should handle very long URLs', async () => {
      // Arrange
      const productDescription = 'Test product';
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.html';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, longUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      expect(mockSearchPerplexity).toHaveBeenCalled();
    });

    it('should handle international domain names', async () => {
      // Arrange
      const productDescription = 'International product';
      const internationalUrl = 'https://例え.テスト';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      const result = await service.research(productDescription, internationalUrl);

      // Assert
      expect(result.content).toBe(mockResearchResult);
      const [, , userPrompt] = mockSearchPerplexity.mock.calls[0];
      expect(userPrompt).toContain(internationalUrl);
    });
  });

  describe('service integration', () => {
    it('should use correct Perplexity model', async () => {
      // Arrange
      const productDescription = 'Test product';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      await service.research(productDescription);

      // Assert
      const [model] = mockSearchPerplexity.mock.calls[0];
      expect(model).toBe(MODELS.perplexity);
    });

    it('should pass through all required parameters', async () => {
      // Arrange
      const productDescription = 'Comprehensive test product with detailed features';
      const websiteUrl = 'https://test-product.com';
      mockSearchPerplexity.mockResolvedValue(mockResearchResult);

      // Act
      await service.research(productDescription, websiteUrl);

      // Assert
      expect(mockSearchPerplexity).toHaveBeenCalledTimes(1);
      expect(mockSearchPerplexity).toHaveBeenCalledWith(
        MODELS.perplexity,
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent research requests', async () => {
      // Arrange
      const descriptions = [
        'Product A - AI tool',
        'Product B - Mobile app',
        'Product C - Hardware device'
      ];
      
      mockSearchPerplexity.mockImplementation((model, system, user) => {
        if (user.includes('Product A')) return Promise.resolve('Research A');
        if (user.includes('Product B')) return Promise.resolve('Research B');
        if (user.includes('Product C')) return Promise.resolve('Research C');
        return Promise.resolve('Default research');
      });

      // Act
      const promises = descriptions.map(desc => service.research(desc));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].content).toBe('Research A');
      expect(results[1].content).toBe('Research B');
      expect(results[2].content).toBe('Research C');
      expect(mockSearchPerplexity).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in concurrent requests', async () => {
      // Arrange
      const descriptions = ['Success product', 'Failure product'];
      
      mockSearchPerplexity.mockImplementation((model, system, user) => {
        if (user.includes('Success')) return Promise.resolve('Success research');
        if (user.includes('Failure')) return Promise.reject(new Error('API error'));
        return Promise.resolve('Default');
      });

      // Act
      const promises = descriptions.map(desc => 
        service.research(desc).catch(error => ({ error: error.message }))
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ content: 'Success research' });
      expect(results[1]).toEqual({ error: 'API error' });
    });
  });
});
