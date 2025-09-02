/**
 * AnalyzerGapService Tests
 * 
 * Comprehensive tests for analyzer gap service covering:
 * - SARIF analysis and processing
 * - AI integration for gap analysis
 * - Input validation and error handling
 * - Security finding processing
 * - Milestone generation from analysis
 * - Network failures and timeouts
 */

import { AnalyzerGapService } from '@/lib/services/AnalyzerGapService';
import type { GapAnalysisResponse } from '@/lib/services/AnalyzerGapService';
import { AIError, AIErrorType } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';
import {
  createAIError,
  setupTestEnvironment,
  simulateTimeout,
  simulateRateLimit
} from '../lib/serviceTestHelpers';

// Mock the callAI method of AIService
const mockCallAI = jest.fn();

// Mock the AIService class
jest.mock('@/lib/ai/aiService', () => {
  const actual = jest.requireActual('@/lib/ai/aiService');
  
  class MockAIService extends actual.AIService {
    callAI = mockCallAI;
    log = jest.fn();
  }
  
  return {
    ...actual,
    AIService: MockAIService,
    default: MockAIService,
  };
});

describe('AnalyzerGapService', () => {
  let service: AnalyzerGapService;
  let restoreEnv: () => void;

  const mockSemgrepSarif = JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Semgrep'
          }
        },
        results: [
          {
            ruleId: 'javascript.express.security.audit.xss',
            level: 'error',
            message: {
              text: 'Potential XSS vulnerability detected'
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: 'src/server.js'
                  },
                  region: {
                    startLine: 42
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  });

  const mockGitleaksSarif = JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Gitleaks'
          }
        },
        results: [
          {
            ruleId: 'aws-access-token',
            level: 'error',
            message: {
              text: 'AWS Access Key ID found'
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: 'config/aws.js'
                  },
                  region: {
                    startLine: 15
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  });

  const mockGrypeSarif = JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Grype'
          }
        },
        results: [
          {
            ruleId: 'CVE-2023-1234',
            level: 'warning',
            message: {
              text: 'Known vulnerability in package dependency'
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: 'package.json'
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  });

  const mockGapAnalysisResponse: GapAnalysisResponse = {
    milestones: [
      {
        title: 'Address Critical Security Vulnerabilities',
        description: 'Fix critical and high-severity security issues identified by static analysis',
        acceptance: [
          'All critical XSS vulnerabilities resolved',
          'Input validation implemented for user-facing endpoints',
          'Security testing suite added with 90% coverage'
        ],
        scope: [
          'Web application security hardening',
          'Input sanitization implementation',
          'Security test automation'
        ],
        relatedFindings: [
          {
            scanner: 'semgrep',
            title: 'XSS Vulnerability',
            severity: 'critical',
            ruleId: 'javascript.express.security.audit.xss',
            location: 'src/server.js:42',
            summary: 'Potential XSS vulnerability detected in Express route handler'
          }
        ]
      },
      {
        title: 'Secrets Management',
        description: 'Implement secure secrets management and remove hardcoded credentials',
        acceptance: [
          'All hardcoded secrets removed from codebase',
          'Secure secrets management solution implemented',
          'Environment-based configuration established'
        ],
        scope: [
          'Credential security audit',
          'Secrets management system',
          'Environment configuration'
        ],
        relatedFindings: [
          {
            scanner: 'gitleaks',
            title: 'AWS Credentials Exposed',
            severity: 'high',
            ruleId: 'aws-access-token',
            location: 'config/aws.js:15',
            summary: 'AWS Access Key ID found in source code'
          }
        ]
      },
      {
        title: 'Dependency Vulnerability Management',
        description: 'Update vulnerable dependencies and establish dependency scanning',
        acceptance: [
          'All critical and high severity dependency vulnerabilities resolved',
          'Automated dependency scanning integrated into CI/CD',
          'Dependency update policy established'
        ],
        scope: [
          'Dependency audit and updates',
          'Vulnerability scanning automation',
          'Dependency management policy'
        ],
        relatedFindings: [
          {
            scanner: 'sbom',
            title: 'Vulnerable Package Dependency',
            severity: 'medium',
            ruleId: 'CVE-2023-1234',
            location: 'package.json',
            summary: 'Known vulnerability in package dependency'
          }
        ]
      }
    ],
    notes: 'Analysis based on static analysis results. Recommendations align with OWASP ASVS Level 2 requirements for enhanced security posture.'
  };

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new AnalyzerGapService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(service).toBeInstanceOf(AnalyzerGapService);
      expect(service['config']).toMatchObject({
        logPrefix: 'AnalyzerGap'
      });
    });
  });

  describe('generateFromSarif', () => {
    it('should analyze SARIF data and generate gap analysis', async () => {
      // Arrange
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif,
        gitleaksSarif: mockGitleaksSarif,
        grypeSarif: mockGrypeSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      expect(result.metadata).toHaveProperty('executionTimeMs');
      expect(result.metadata).toHaveProperty('retries', 0);
      
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        expect.any(Object), // Zod schema
        'Gap Analysis Generation from SARIF',
        'gap_analysis'
      );
    });

    it('should handle missing SARIF inputs gracefully', async () => {
      // Arrange
      const minimalInput = {
        repoUrl: 'https://github.com/test/minimal-repo'
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(minimalInput);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Semgrep: none');
      expect(userMessage.content).toContain('Gitleaks: none');
      expect(userMessage.content).toContain('Grype: none');
    });

    it('should handle partial SARIF data', async () => {
      // Arrange
      const partialInput = {
        repoUrl: 'https://github.com/test/partial-repo',
        semgrepSarif: mockSemgrepSarif,
        // Missing gitleaksSarif and grypeSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(partialInput);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Semgrep: provided');
      expect(userMessage.content).toContain('Gitleaks: none');
      expect(userMessage.content).toContain('Grype: none');
    });

    it('should include repository URL in analysis', async () => {
      // Arrange
      const input = {
        repoUrl: 'https://github.com/secure-org/critical-app',
        semgrepSarif: mockSemgrepSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      await service.generateFromSarif(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Repository: https://github.com/secure-org/critical-app');
    });
  });

  describe('system message configuration', () => {
    it('should use appropriate system message for security analysis', async () => {
      // Arrange
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      await service.generateFromSarif(input);

      // Assert
      const [, messages] = mockCallAI.mock.calls[0];
      const systemMessage = messages.find((m: any) => m.role === 'system');
      
      expect(systemMessage.content).toContain('senior security and reliability consultant');
      expect(systemMessage.content).toContain('SARIF scanner outputs');
      expect(systemMessage.content).toContain('practical gap analysis');
      expect(systemMessage.content).toContain('OWASP ASVS L1-L2');
      expect(systemMessage.content).toContain('concise and actionable');
      expect(systemMessage.content).toContain('service providers');
    });
  });

  describe('output validation', () => {
    it('should validate gap analysis response structure', async () => {
      // Arrange
      const invalidOutput = {
        milestones: [] // Invalid - must have at least 1 milestone
      };
      
      mockCallAI.mockResolvedValue(invalidOutput);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow();
    });

    it('should validate milestone structure', async () => {
      // Arrange
      const invalidMilestones = {
        milestones: [
          {
            title: '', // Invalid - empty title
            description: 'Valid description',
            acceptance: [], // Invalid - must have at least 1 item
            scope: ['Valid scope'],
            relatedFindings: []
          }
        ],
        notes: ''
      };
      
      mockCallAI.mockResolvedValue(invalidMilestones);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow();
    });

    it('should validate finding structure when present', async () => {
      // Arrange
      const invalidFindings = {
        milestones: [
          {
            title: 'Valid Title',
            description: 'Valid description',
            acceptance: ['Valid acceptance'],
            scope: ['Valid scope'],
            relatedFindings: [
              {
                scanner: 'invalid_scanner', // Invalid enum value
                title: 'Finding title',
                severity: 'critical',
                ruleId: 'test-rule',
                location: 'test.js:1',
                summary: 'Test finding'
              }
            ]
          }
        ],
        notes: ''
      };
      
      mockCallAI.mockResolvedValue(invalidFindings);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow();
    });

    it('should validate severity enum values', async () => {
      // Arrange
      const invalidSeverity = {
        milestones: [
          {
            title: 'Valid Title',
            description: 'Valid description',
            acceptance: ['Valid acceptance'],
            scope: ['Valid scope'],
            relatedFindings: [
              {
                scanner: 'semgrep',
                title: 'Finding title',
                severity: 'invalid_severity', // Invalid enum value
                ruleId: 'test-rule',
                location: 'test.js:1',
                summary: 'Test finding'
              }
            ]
          }
        ],
        notes: ''
      };
      
      mockCallAI.mockResolvedValue(invalidSeverity);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle AI service errors', async () => {
      // Arrange
      const aiError = createAIError(AIErrorType.API_ERROR, 'AI service unavailable');
      mockCallAI.mockRejectedValue(aiError);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow('AI service unavailable');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = createAIError(AIErrorType.TIMEOUT, 'Request timeout', true);
      mockCallAI.mockRejectedValue(timeoutError);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      // Arrange
      const rateLimitError = createAIError(AIErrorType.RATE_LIMIT, 'Rate limit exceeded', true);
      mockCallAI.mockRejectedValue(rateLimitError);

      // Act & Assert
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      await expect(service.generateFromSarif(input))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors with retry logic', async () => {
      // Arrange
      const networkError = createAIError(AIErrorType.NETWORK, 'Network error', true);
      mockCallAI
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockGapAnalysisResponse);

      // Act
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      expect(mockCallAI).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed SARIF data gracefully', async () => {
      // Arrange
      const invalidSarif = 'invalid json';
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: invalidSarif
      };
      
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      // Service should still process even with malformed SARIF
    });

    it('should handle empty SARIF data', async () => {
      // Arrange
      const emptySarif = JSON.stringify({});
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: emptySarif
      };
      
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
    });
  });

  describe('different security scenarios', () => {
    it('should analyze web application security issues', async () => {
      // Arrange
      const webAppSarif = JSON.stringify({
        runs: [{
          results: [
            { ruleId: 'xss-vulnerability', level: 'error' },
            { ruleId: 'sql-injection', level: 'error' },
            { ruleId: 'csrf-missing', level: 'warning' }
          ]
        }]
      });
      
      const input = {
        repoUrl: 'https://github.com/webapp/ecommerce',
        semgrepSarif: webAppSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
      const [, messages] = mockCallAI.mock.calls[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('ecommerce');
    });

    it('should analyze API security issues', async () => {
      // Arrange
      const apiSarif = JSON.stringify({
        runs: [{
          results: [
            { ruleId: 'missing-auth', level: 'error' },
            { ruleId: 'weak-jwt', level: 'warning' },
            { ruleId: 'rate-limiting-missing', level: 'info' }
          ]
        }]
      });
      
      const input = {
        repoUrl: 'https://github.com/api/microservices',
        semgrepSarif: apiSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
    });

    it('should analyze infrastructure security issues', async () => {
      // Arrange
      const infraSarif = JSON.stringify({
        runs: [{
          results: [
            { ruleId: 'docker-root-user', level: 'warning' },
            { ruleId: 'k8s-security-context', level: 'error' },
            { ruleId: 'terraform-encryption', level: 'high' }
          ]
        }]
      });
      
      const input = {
        repoUrl: 'https://github.com/infra/kubernetes-config',
        semgrepSarif: infraSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very large SARIF files', async () => {
      // Arrange
      const largeSarif = JSON.stringify({
        runs: [{
          results: Array.from({ length: 1000 }, (_, i) => ({
            ruleId: `rule-${i}`,
            level: 'info',
            message: { text: `Finding ${i}` }
          }))
        }]
      });
      
      const input = {
        repoUrl: 'https://github.com/large/codebase',
        semgrepSarif: largeSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
    });

    it('should handle special characters in repository URLs', async () => {
      // Arrange
      const input = {
        repoUrl: 'https://github.com/org/repo-with-special-chars_123.git',
        semgrepSarif: mockSemgrepSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(mockGapAnalysisResponse);
    });

    it('should handle null and optional fields correctly', async () => {
      // Arrange
      const responseWithNulls = {
        milestones: [
          {
            title: 'Test Milestone',
            description: 'Test description',
            acceptance: ['Test acceptance'],
            scope: ['Test scope'],
            relatedFindings: [
              {
                scanner: 'semgrep',
                title: 'Test Finding',
                severity: null, // Nullable field
                ruleId: null, // Nullable field
                location: null, // Nullable field
                summary: 'Test summary'
              }
            ]
          }
        ],
        notes: '' // Default empty string
      };
      
      mockCallAI.mockResolvedValue(responseWithNulls);

      // Act
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      const result = await service.generateFromSarif(input);

      // Assert
      expect(result.data).toEqual(responseWithNulls);
    });
  });

  describe('service configuration', () => {
    it('should use MODELS.best for gap analysis', async () => {
      // Arrange
      const input = {
        repoUrl: 'https://github.com/test/repo',
        semgrepSarif: mockSemgrepSarif
      };
      
      mockCallAI.mockResolvedValue(mockGapAnalysisResponse);

      // Act
      await service.generateFromSarif(input);

      // Assert
      expect(mockCallAI).toHaveBeenCalledWith(
        MODELS.best,
        expect.any(Array),
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use correct log prefix', () => {
      // The service should be configured with appropriate log prefix
      expect(service['config'].logPrefix).toBe('AnalyzerGap');
    });
  });

  describe('concurrent analysis', () => {
    it('should handle multiple concurrent analysis requests', async () => {
      // Arrange
      const inputs = [
        {
          repoUrl: 'https://github.com/repo/a',
          semgrepSarif: mockSemgrepSarif
        },
        {
          repoUrl: 'https://github.com/repo/b',
          gitleaksSarif: mockGitleaksSarif
        },
        {
          repoUrl: 'https://github.com/repo/c',
          grypeSarif: mockGrypeSarif
        }
      ];
      
      mockCallAI.mockImplementation((model, messages) => {
        const userMessage = messages.find((m: any) => m.role === 'user');
        if (userMessage.content.includes('repo/a')) {
          return Promise.resolve({ ...mockGapAnalysisResponse, notes: 'Analysis A' });
        }
        if (userMessage.content.includes('repo/b')) {
          return Promise.resolve({ ...mockGapAnalysisResponse, notes: 'Analysis B' });
        }
        return Promise.resolve({ ...mockGapAnalysisResponse, notes: 'Analysis C' });
      });

      // Act
      const promises = inputs.map(input => service.generateFromSarif(input));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].data.notes).toBe('Analysis A');
      expect(results[1].data.notes).toBe('Analysis B');
      expect(results[2].data.notes).toBe('Analysis C');
      expect(mockCallAI).toHaveBeenCalledTimes(3);
    });
  });
});
