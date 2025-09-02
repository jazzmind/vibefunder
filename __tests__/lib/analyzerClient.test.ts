import {
  startAnalysis,
  getJob,
  getSow,
  getCapabilities,
  cancelJob,
  getPlan,
  getReport,
  getAggregate,
  featureScan
} from '@/lib/analyzerClient';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console.log to test debug functionality
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

describe('analyzerClient', () => {
  const originalEnv = process.env;
  const mockToken = 'mock_access_token';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Set default environment variables
    process.env.ANALYZER_BASE_URL = 'http://localhost:8080';
    process.env.ANALYZER_CLIENT_ID = 'test_client_id';
    process.env.ANALYZER_CLIENT_SECRET = 'test_client_secret';
    process.env.ANALYZER_DEBUG = '1';
  });

  afterEach(() => {
    process.env = originalEnv;
    // Reset the module cache to clear the token cache
    jest.resetModules();
  });

  // Helper function to mock successful token response
  const mockTokenResponse = (expiresIn = 3600) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        access_token: mockToken,
        expires_in: expiresIn
      })
    } as Response);
  };

  // Helper function to mock failed token response
  const mockFailedTokenResponse = (status = 401, text = 'Unauthorized') => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      text: () => Promise.resolve(text)
    } as Response);
  };

  describe('Token management', () => {
    it('should obtain access token successfully', async () => {
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test_job' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: expect.any(URLSearchParams)
        })
      );
    });

    it('should cache token and reuse it', async () => {
      mockTokenResponse();
      
      // Mock two API calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'job1' })
      } as Response);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'job2' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo1' });
      await startAnalysis({ repo_url: 'https://github.com/test/repo2' });

      // Token endpoint should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 token + 2 API calls
    });

    it('should handle token expiration and refresh', async () => {
      // First token expires in 1 second
      mockTokenResponse(1);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'job1' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo1' });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Mock new token request
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'job2' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo2' });

      // Should have called token endpoint twice
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/oauth/token',
        expect.any(Object)
      );
    });

    it('should throw error when credentials are missing', async () => {
      delete process.env.ANALYZER_CLIENT_ID;
      
      await expect(startAnalysis({ repo_url: 'test' }))
        .rejects.toThrow('Analyzer client credentials missing');
    });

    it('should handle token request failure', async () => {
      mockFailedTokenResponse(401, 'Invalid client credentials');

      await expect(startAnalysis({ repo_url: 'test' }))
        .rejects.toThrow('Analyzer token failed: 401 Invalid client credentials');
    });
  });

  describe('Debug functionality', () => {
    it('should log debug messages when ANALYZER_DEBUG is enabled', async () => {
      process.env.ANALYZER_DEBUG = '1';
      
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test_job' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AnalyzerClient]',
        expect.stringContaining('getAccessToken: POST')
      );
    });

    it('should not log debug messages when ANALYZER_DEBUG is disabled', async () => {
      process.env.ANALYZER_DEBUG = '0';
      
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test_job' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo' });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages in non-production environment', async () => {
      delete process.env.ANALYZER_DEBUG;
      process.env.NODE_ENV = 'development';
      
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test_job' })
      } as Response);

      await startAnalysis({ repo_url: 'https://github.com/test/repo' });

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('maskValue utility', () => {
    it('should mask long values correctly', () => {
      // This is testing the internal maskValue function indirectly through debug logs
      process.env.ANALYZER_CLIENT_ID = 'very_long_client_id_that_should_be_masked';
      
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test_job' })
      } as Response);

      return startAnalysis({ repo_url: 'https://github.com/test/repo' }).then(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[AnalyzerClient]',
          expect.stringContaining('very…sked')
        );
      });
    });
  });

  describe('startAnalysis', () => {
    it('should start analysis with correct payload', async () => {
      const payload = {
        repo_url: 'https://github.com/test/repo',
        branch: 'main',
        github_token: 'gh_token_123',
        scanners: ['semgrep', 'bandit'],
        timeout_seconds: 300
      };

      mockTokenResponse();
      const mockResponse = { job_id: 'analysis_job_123' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await startAnalysis(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/analyze',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request')
      } as Response);

      await expect(startAnalysis({ repo_url: 'invalid_url' }))
        .rejects.toThrow('Analyzer start failed: 400 Bad request');
    });
  });

  describe('getJob', () => {
    it('should get job details successfully', async () => {
      const jobId = 'job_123';
      const mockJobData = { 
        id: jobId, 
        status: 'completed',
        results: ['Finding 1', 'Finding 2'] 
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJobData)
      } as Response);

      const result = await getJob(jobId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/jobs/${jobId}`,
        expect.objectContaining({
          headers: { 'authorization': `Bearer ${mockToken}` }
        })
      );

      expect(result).toEqual(mockJobData);
    });

    it('should handle job not found', async () => {
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Job not found')
      } as Response);

      await expect(getJob('nonexistent_job'))
        .rejects.toThrow('Analyzer job failed: 404');
    });
  });

  describe('getSow', () => {
    it('should get statement of work successfully', async () => {
      const jobId = 'job_123';
      const mockSowData = { 
        title: 'Analysis SOW',
        tasks: ['Task 1', 'Task 2'],
        timeline: '2 weeks'
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSowData)
      } as Response);

      const result = await getSow(jobId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/jobs/${jobId}/sow`,
        expect.objectContaining({
          headers: { 'authorization': `Bearer ${mockToken}` }
        })
      );

      expect(result).toEqual(mockSowData);
    });
  });

  describe('getCapabilities', () => {
    it('should get analyzer capabilities', async () => {
      const mockCapabilities = {
        scanners: ['semgrep', 'bandit', 'eslint'],
        languages: ['python', 'javascript', 'java']
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCapabilities)
      } as Response);

      const result = await getCapabilities();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/capabilities',
        expect.objectContaining({
          headers: { 'authorization': `Bearer ${mockToken}` }
        })
      );

      expect(result).toEqual(mockCapabilities);
    });
  });

  describe('cancelJob', () => {
    it('should cancel job successfully', async () => {
      const jobId = 'job_to_cancel';

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await cancelJob(jobId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/jobs/${jobId}/cancel`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'authorization': `Bearer ${mockToken}` }
        })
      );
    });

    it('should handle cancel job failure', async () => {
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: () => Promise.resolve('Job already completed')
      } as Response);

      await expect(cancelJob('completed_job'))
        .rejects.toThrow('Analyzer cancel failed: 409');
    });
  });

  describe('getPlan', () => {
    it('should get plan successfully', async () => {
      const payload = { repo_url: 'https://github.com/test/repo' };
      const mockPlan = {
        phases: ['Analysis', 'Remediation'],
        duration: '4 weeks'
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlan)
      } as Response);

      const result = await getPlan(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/plan',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      );

      expect(result).toEqual(mockPlan);
    });
  });

  describe('getReport', () => {
    it('should get report successfully', async () => {
      const jobId = 'job_123';
      const reportName = 'security_report';
      const mockReport = {
        name: reportName,
        content: 'Report content here'
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport)
      } as Response);

      const result = await getReport(jobId, reportName);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/jobs/${jobId}/reports/${encodeURIComponent(reportName)}`,
        expect.objectContaining({
          headers: { 'authorization': `Bearer ${mockToken}` }
        })
      );

      expect(result).toEqual(mockReport);
    });

    it('should handle special characters in report name', async () => {
      const jobId = 'job_123';
      const reportName = 'report with spaces & symbols!';

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: reportName, content: 'test' })
      } as Response);

      await getReport(jobId, reportName);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/jobs/${jobId}/reports/${encodeURIComponent(reportName)}`,
        expect.any(Object)
      );
    });
  });

  describe('getAggregate', () => {
    it('should get aggregate data successfully', async () => {
      const payload = {
        repo_url: 'https://github.com/test/repo',
        website_url: 'https://example.com'
      };
      const mockAggregate = {
        summary: 'Aggregate analysis results',
        metrics: { issues: 5, warnings: 10 }
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAggregate)
      } as Response);

      const result = await getAggregate(payload);

      const expectedBody = {
        repo_url: payload.repo_url,
        semgrep_config_path: payload.website_url // piggyback param
      };

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/aggregate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(expectedBody)
        })
      );

      expect(result).toEqual(mockAggregate);
    });

    it('should handle payload without website_url', async () => {
      const payload = { repo_url: 'https://github.com/test/repo' };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      await getAggregate(payload);

      const expectedBody = { repo_url: payload.repo_url };
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/aggregate',
        expect.objectContaining({
          body: JSON.stringify(expectedBody)
        })
      );
    });
  });

  describe('featureScan', () => {
    it('should perform feature scan successfully', async () => {
      const payload = {
        repo_url: 'https://github.com/test/repo',
        features: [
          {
            name: 'authentication',
            keywords: ['login', 'auth', 'signin'],
            file_globs: ['**/*auth*', '**/*login*']
          }
        ],
        branch: 'main',
        github_token: 'gh_token_123'
      };
      const mockResults = {
        features_found: ['authentication'],
        confidence_scores: { authentication: 0.95 }
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults)
      } as Response);

      const result = await featureScan(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/features',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'authorization': `Bearer ${mockToken}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      );

      expect(result).toEqual(mockResults);
    });

    it('should handle minimal feature scan payload', async () => {
      const payload = {
        repo_url: 'https://github.com/test/repo',
        features: [{ name: 'basic_feature' }]
      };

      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);

      await featureScan(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/features',
        expect.objectContaining({
          body: JSON.stringify(payload)
        })
      );
    });
  });

  describe('Environment configuration', () => {
    it('should use default base URL when not configured', () => {
      delete process.env.ANALYZER_BASE_URL;
      
      // Re-import module to get new environment values
      jest.resetModules();
      
      // The module should still work with default URL
      expect(() => require('@/lib/analyzerClient')).not.toThrow();
    });

    it('should handle custom base URL', async () => {
      process.env.ANALYZER_BASE_URL = 'https://custom-analyzer.example.com';
      
      jest.resetModules();
      const { startAnalysis: customStartAnalysis } = require('@/lib/analyzerClient');
      
      mockTokenResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ job_id: 'test' })
      } as Response);

      await customStartAnalysis({ repo_url: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-analyzer.example.com/oauth/token',
        expect.any(Object)
      );
    });
  });
});