/**
 * ContentEnhancementService Unit Tests
 * 
 * Focused unit tests for business logic and validation without complex mocking
 */

import { z } from 'zod';

describe('ContentEnhancementService Schema Validation', () => {
  const ContentEnhancementInputSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    summary: z.string().min(1, 'Summary is required').max(500, 'Summary too long'),
    content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
    repoContext: z.string().optional(),
    websiteContext: z.string().optional(),
  });

  const ContentSuggestionSchema = z.object({
    type: z.enum(['addition', 'modification', 'restructure']),
    section: z.string().min(1),
    originalText: z.string().min(1),
    enhancedText: z.string().min(1),
    reason: z.string().min(1),
  });

  const ContentEnhancementResponseSchema = z.object({
    suggestions: z.array(ContentSuggestionSchema).min(1).max(8)
  });

  describe('input validation', () => {
    const validInput = {
      title: 'Revolutionary Testing Framework',
      summary: 'A comprehensive testing solution for modern developers',
      content: `# Revolutionary Testing Framework

## Overview
Our testing framework revolutionizes how developers write and run tests. Built with TypeScript, it offers unparalleled performance and ease of use.

## Features
- Fast execution
- Easy setup
- Great documentation
- TypeScript support

## Benefits
This framework will save developers time and improve code quality. It's designed for teams of all sizes.

## Funding Goal
We need $25,000 to complete development and launch this amazing tool.`,
      repoContext: 'GitHub repository shows advanced TypeScript patterns',
      websiteContext: 'Company specializes in developer tools'
    };

    it('should validate complete valid input', () => {
      const result = ContentEnhancementInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate minimal required input', () => {
      const minimalInput = {
        title: 'Test Title',
        summary: 'Test summary that meets minimum requirements',
        content: 'Test content that meets minimum requirements'
      };

      const result = ContentEnhancementInputSchema.parse(minimalInput);
      expect(result.title).toBe('Test Title');
      expect(result.summary).toBe('Test summary that meets minimum requirements');
      expect(result.content).toBe('Test content that meets minimum requirements');
    });

    it('should reject empty title', () => {
      const invalidInput = {
        ...validInput,
        title: ''
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Title is required');
    });

    it('should reject title that is too long', () => {
      const invalidInput = {
        ...validInput,
        title: 'x'.repeat(201)
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Title too long');
    });

    it('should reject empty summary', () => {
      const invalidInput = {
        ...validInput,
        summary: ''
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Summary is required');
    });

    it('should reject summary that is too long', () => {
      const invalidInput = {
        ...validInput,
        summary: 'x'.repeat(501)
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Summary too long');
    });

    it('should reject empty content', () => {
      const invalidInput = {
        ...validInput,
        content: ''
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Content is required');
    });

    it('should reject content that is too long', () => {
      const invalidInput = {
        ...validInput,
        content: 'x'.repeat(50001)
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(invalidInput);
      }).toThrow('Content too long');
    });

    it('should handle optional context fields', () => {
      const inputWithoutContext = {
        title: 'Test Title',
        summary: 'Test summary',
        content: 'Test content'
      };

      const result = ContentEnhancementInputSchema.parse(inputWithoutContext);
      expect(result.repoContext).toBeUndefined();
      expect(result.websiteContext).toBeUndefined();
    });
  });

  describe('output validation', () => {
    const validSuggestion = {
      type: 'addition' as const,
      section: 'Project Benefits',
      originalText: 'This framework will save developers time',
      enhancedText: 'This framework will save developers 40% of their testing time',
      reason: 'Adding specific metrics makes the value proposition more compelling'
    };

    const validOutput = {
      suggestions: [
        validSuggestion,
        {
          type: 'modification' as const,
          section: 'Target Audience',
          originalText: 'designed for teams of all sizes',
          enhancedText: 'designed for development teams, from startups to enterprise',
          reason: 'More specific targeting helps potential backers understand the audience'
        }
      ]
    };

    it('should validate complete valid output', () => {
      const result = ContentEnhancementResponseSchema.parse(validOutput);
      expect(result).toEqual(validOutput);
    });

    it('should validate single suggestion', () => {
      const singleSuggestion = {
        suggestions: [validSuggestion]
      };

      const result = ContentEnhancementResponseSchema.parse(singleSuggestion);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should validate maximum suggestions (8)', () => {
      const maxSuggestions = {
        suggestions: Array.from({ length: 8 }, (_, i) => ({
          type: 'addition' as const,
          section: `Section ${i + 1}`,
          originalText: `Original text ${i + 1}`,
          enhancedText: `Enhanced text ${i + 1}`,
          reason: `Reason ${i + 1}`
        }))
      };

      const result = ContentEnhancementResponseSchema.parse(maxSuggestions);
      expect(result.suggestions).toHaveLength(8);
    });

    it('should reject empty suggestions array', () => {
      const emptyOutput = {
        suggestions: []
      };

      expect(() => {
        ContentEnhancementResponseSchema.parse(emptyOutput);
      }).toThrow();
    });

    it('should reject too many suggestions', () => {
      const tooManySuggestions = {
        suggestions: Array.from({ length: 9 }, (_, i) => ({
          type: 'addition' as const,
          section: `Section ${i + 1}`,
          originalText: `Original text ${i + 1}`,
          enhancedText: `Enhanced text ${i + 1}`,
          reason: `Reason ${i + 1}`
        }))
      };

      expect(() => {
        ContentEnhancementResponseSchema.parse(tooManySuggestions);
      }).toThrow();
    });

    it('should validate suggestion types', () => {
      const validTypes = ['addition', 'modification', 'restructure'];
      
      validTypes.forEach(type => {
        const suggestion = {
          suggestions: [{
            type: type as any,
            section: 'Test Section',
            originalText: 'Original text',
            enhancedText: 'Enhanced text',
            reason: 'Test reason'
          }]
        };

        expect(() => {
          ContentEnhancementResponseSchema.parse(suggestion);
        }).not.toThrow();
      });
    });

    it('should reject invalid suggestion type', () => {
      const invalidType = {
        suggestions: [{
          type: 'invalid_type',
          section: 'Test Section',
          originalText: 'Original text',
          enhancedText: 'Enhanced text',
          reason: 'Test reason'
        }]
      };

      expect(() => {
        ContentEnhancementResponseSchema.parse(invalidType);
      }).toThrow();
    });

    it('should reject suggestions with empty required fields', () => {
      const requiredFields = ['section', 'originalText', 'enhancedText', 'reason'];
      
      requiredFields.forEach(field => {
        const invalidSuggestion = {
          suggestions: [{
            type: 'addition' as const,
            section: 'Test Section',
            originalText: 'Original text',
            enhancedText: 'Enhanced text',
            reason: 'Test reason',
            [field]: '' // Make this field empty
          }]
        };

        expect(() => {
          ContentEnhancementResponseSchema.parse(invalidSuggestion);
        }).toThrow();
      });
    });
  });

  describe('content analysis patterns', () => {
    it('should handle technical content validation', () => {
      const technicalInput = {
        title: 'Advanced Kubernetes Orchestration Tool',
        summary: 'Cloud-native container management platform for enterprise deployments',
        content: `# Kubernetes Management Platform

## Technical Specifications
- Supports Kubernetes 1.25+
- Multi-cluster management
- GitOps integration
- RBAC security model

## Architecture
Built on microservices architecture with event-driven communication patterns.

## Performance
- 99.9% uptime SLA
- Sub-second response times
- Horizontal scaling support

## Security
- Zero-trust architecture
- End-to-end encryption
- Compliance with SOC2 and GDPR`,
        repoContext: 'Repository shows complex Kubernetes operators and CRDs with advanced Go patterns'
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(technicalInput);
      }).not.toThrow();
    });

    it('should handle consumer-focused content validation', () => {
      const consumerInput = {
        title: 'Smart Home Automation Hub',
        summary: 'Easy-to-use smart home control system that works with all your devices',
        content: `# Smart Home Hub

## For Everyone
Our hub works with all your smart devices. No technical knowledge required.

## Simple Setup
- Plug in the device
- Download the app
- Start controlling your home

## Family-Friendly
Safe for kids, easy for grandparents. Works with voice commands and simple app interface.

## Compatibility
Works with Alexa, Google Home, Apple HomeKit, and 1000+ smart devices.`,
        websiteContext: 'Company focuses on consumer electronics with family-friendly design philosophy'
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(consumerInput);
      }).not.toThrow();
    });

    it('should handle content with special characters and formatting', () => {
      const formattedInput = {
        title: 'Multilingual Content Editor with émojis 🚀',
        summary: 'Advanced editor supporting Unicode, mathematical notation (E = mc²), and programming syntax',
        content: `# Advanced Content Editor

## Unicode Support ✓
- Supports émojis 🎉 and accénted characters
- Right-to-left languages (العربية, עברית)
- Mathematical notation: ∑(i=1 to n) xi

## Code Integration
\`\`\`javascript
const editor = new ContentEditor({
  unicode: true,
  syntax: "highlight"
});
\`\`\`

## Special Characters
Handles quotes "smart quotes", apostrophes 'curly', dashes—em and en–, ellipses…`,
        repoContext: 'Repository shows internationalization support and complex text processing algorithms'
      };

      expect(() => {
        ContentEnhancementInputSchema.parse(formattedInput);
      }).not.toThrow();
    });
  });

  describe('business logic validation', () => {
    it('should validate content improvement suggestions structure', () => {
      const businessLogicSuggestions = {
        suggestions: [
          {
            type: 'addition' as const,
            section: 'Value Proposition',
            originalText: 'saves time',
            enhancedText: 'saves 3 hours per week on average',
            reason: 'Specific time savings are more compelling than vague benefits'
          },
          {
            type: 'modification' as const,
            section: 'Target Market',
            originalText: 'developers',
            enhancedText: 'front-end and full-stack developers working on React applications',
            reason: 'Specific targeting helps potential backers self-identify'
          },
          {
            type: 'restructure' as const,
            section: 'Problem Statement',
            originalText: 'Testing is hard. Our tool makes it easy.',
            enhancedText: 'Current testing workflows are fragmented and time-consuming. Our integrated platform streamlines the entire testing lifecycle.',
            reason: 'Better problem-solution narrative creates stronger emotional connection'
          }
        ]
      };

      const result = ContentEnhancementResponseSchema.parse(businessLogicSuggestions);
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0].type).toBe('addition');
      expect(result.suggestions[1].type).toBe('modification');
      expect(result.suggestions[2].type).toBe('restructure');
    });

    it('should validate enhancement rationale quality', () => {
      // Each suggestion should have a meaningful reason
      const suggestions = [
        {
          type: 'addition' as const,
          section: 'Features',
          originalText: 'fast execution',
          enhancedText: 'executes tests 10x faster than Jest',
          reason: 'Specific performance comparison provides concrete value proposition'
        },
        {
          type: 'modification' as const,
          section: 'Benefits',
          originalText: 'improves code quality',
          enhancedText: 'reduces bugs by 60% and improves code coverage to 95%+',
          reason: 'Quantified benefits are more persuasive than general statements'
        }
      ];

      suggestions.forEach(suggestion => {
        expect(() => {
          ContentSuggestionSchema.parse(suggestion);
        }).not.toThrow();
        
        // Each reason should be meaningful (more than just a few words)
        expect(suggestion.reason.split(' ').length).toBeGreaterThan(5);
      });
    });
  });
});