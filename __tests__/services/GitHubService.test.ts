/**
 * GitHubService Tests
 * 
 * Comprehensive tests for GitHub API integration service covering:
 * - Repository URL parsing and validation
 * - GitHub API request handling with various scenarios
 * - Error handling for network issues and API limits
 * - Content extraction (README, documentation)
 * - Authentication and rate limiting
 */

import { GitHubService } from '@/lib/services/GitHubService';
import {
  mockFetch,
  mockGitHubRepo,
  mockReadmeContent,
  setupTestEnvironment
} from '../lib/serviceTestHelpers';

describe('GitHubService', () => {
  let service: GitHubService;
  let restoreEnv: () => void;
  let restoreFetch: () => void;

  beforeEach(() => {
    restoreEnv = setupTestEnvironment();
    service = new GitHubService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    restoreEnv();
    if (restoreFetch) {
      restoreFetch();
    }
  });

  describe('constructor', () => {
    it('should initialize without token', () => {
      const serviceWithoutToken = new GitHubService();
      expect(serviceWithoutToken).toBeInstanceOf(GitHubService);
    });

    it('should initialize with GitHub token', () => {
      const serviceWithToken = new GitHubService('ghp_test_token_123');
      expect(serviceWithToken).toBeInstanceOf(GitHubService);
    });
  });

  describe('parseRepoUrl', () => {
    it('should parse standard GitHub URL', async () => {
      // Test indirectly through getRepository which calls parseRepoUrl
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      const result = await service.getRepository('https://github.com/testuser/test-repo');
      expect(result).toEqual(mockGitHubRepo);
    });

    it('should parse GitHub URL with .git suffix', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      const result = await service.getRepository('https://github.com/testuser/test-repo.git');
      expect(result).toEqual(mockGitHubRepo);
    });

    it('should parse owner/repo format', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      const result = await service.getRepository('testuser/test-repo');
      expect(result).toEqual(mockGitHubRepo);
    });

    it('should parse GitHub URL with additional path', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      const result = await service.getRepository('https://github.com/testuser/test-repo/tree/main');
      expect(result).toEqual(mockGitHubRepo);
    });

    it('should return null for invalid URL formats', async () => {
      const result = await service.getRepository('invalid-url-format');
      expect(result).toBeNull();
    });
  });

  describe('getRepository', () => {
    it('should fetch repository information successfully', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      const result = await service.getRepository('testuser/test-repo');
      
      expect(result).toEqual(mockGitHubRepo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testuser/test-repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'VibeFunder-Campaign-Generator'
          })
        })
      );
    });

    it('should handle 404 repository not found', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/nonexistent/repo': {
          ok: false,
          status: 404
        }
      });

      await expect(service.getRepository('nonexistent/repo'))
        .rejects.toThrow('Repository not found or not accessible');
    });

    it('should handle API errors', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': {
          ok: false,
          status: 500
        }
      });

      await expect(service.getRepository('testuser/test-repo'))
        .rejects.toThrow('GitHub API error: 500');
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.getRepository('testuser/test-repo'))
        .rejects.toThrow('Network error');
    });

    it('should include authorization header when token provided', async () => {
      const serviceWithToken = new GitHubService('ghp_test_token');
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': mockGitHubRepo
      });

      await serviceWithToken.getRepository('testuser/test-repo');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token ghp_test_token'
          })
        })
      );
    });
  });

  describe('getRepositoryContents', () => {
    const mockContents = [
      {
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        download_url: 'https://raw.githubusercontent.com/user/repo/main/README.md',
        size: 1024
      },
      {
        name: 'src',
        path: 'src',
        type: 'dir',
        download_url: null,
        size: 0
      }
    ];

    it('should fetch repository root contents', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/': mockContents
      });

      const result = await service.getRepositoryContents('testuser/test-repo');
      
      expect(result).toEqual(mockContents);
    });

    it('should fetch specific path contents', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/src': mockContents
      });

      const result = await service.getRepositoryContents('testuser/test-repo', 'src');
      
      expect(result).toEqual(mockContents);
    });

    it('should handle API errors gracefully', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/': {
          ok: false,
          status: 404
        }
      });

      const result = await service.getRepositoryContents('testuser/test-repo');
      
      expect(result).toEqual([]);
    });

    it('should handle non-array responses', async () => {
      // Sometimes GitHub API returns a single file object instead of array
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/README.md': {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          content: Buffer.from(mockReadmeContent).toString('base64'),
          encoding: 'base64'
        }
      });

      const result = await service.getRepositoryContents('testuser/test-repo', 'README.md');
      
      expect(result).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('should fetch and decode base64 file content', async () => {
      const encodedContent = Buffer.from(mockReadmeContent).toString('base64');
      
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/README.md': {
          content: encodedContent,
          encoding: 'base64'
        }
      });

      const result = await service.getFileContent('testuser/test-repo', 'README.md');
      
      expect(result).toBe(mockReadmeContent);
    });

    it('should handle missing files', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/nonexistent.md': {
          ok: false,
          status: 404
        }
      });

      const result = await service.getFileContent('testuser/test-repo', 'nonexistent.md');
      
      expect(result).toBeNull();
    });

    it('should handle files without content', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/empty.md': {
          content: null,
          encoding: 'base64'
        }
      });

      const result = await service.getFileContent('testuser/test-repo', 'empty.md');
      
      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.getFileContent('testuser/test-repo', 'README.md');
      
      expect(result).toBeNull();
    });
  });

  describe('findReadme', () => {
    it('should find README.md file', async () => {
      const encodedContent = Buffer.from(mockReadmeContent).toString('base64');
      
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/README.md': {
          content: encodedContent,
          encoding: 'base64'
        }
      });

      const result = await service.findReadme('testuser/test-repo');
      
      expect(result).toBe(mockReadmeContent);
    });

    it('should try multiple README patterns', async () => {
      const encodedContent = Buffer.from(mockReadmeContent).toString('base64');
      
      // Mock first patterns to return 404, last one to succeed
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 }) // README.md
        .mockResolvedValueOnce({ ok: false, status: 404 }) // readme.md
        .mockResolvedValueOnce({ ok: false, status: 404 }) // Readme.md
        .mockResolvedValueOnce({ ok: false, status: 404 }) // README.txt
        .mockResolvedValueOnce({ ok: false, status: 404 }) // README
        .mockResolvedValueOnce({ // readme
          ok: true,
          json: () => Promise.resolve({
            content: encodedContent,
            encoding: 'base64'
          })
        });

      const result = await service.findReadme('testuser/test-repo');
      
      expect(result).toBe(mockReadmeContent);
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });

    it('should return null when no README found', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const result = await service.findReadme('testuser/test-repo');
      
      expect(result).toBeNull();
    });
  });

  describe('findDocumentation', () => {
    it('should find documentation files in docs directory', async () => {
      const mockDocsFiles = [
        {
          name: 'api.md',
          path: 'docs/api.md',
          type: 'file',
          download_url: 'https://example.com/api.md',
          size: 1024
        },
        {
          name: 'guide.md',
          path: 'docs/guide.md',
          type: 'file',
          download_url: 'https://example.com/guide.md',
          size: 2048
        }
      ];

      const apiContent = '# API Documentation\nAPI usage examples...';
      const guideContent = '# User Guide\nHow to use this project...';

      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // docs directory contents
          ok: true,
          json: () => Promise.resolve(mockDocsFiles)
        })
        .mockResolvedValueOnce({ // api.md content
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from(apiContent).toString('base64'),
            encoding: 'base64'
          })
        })
        .mockResolvedValueOnce({ // guide.md content
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from(guideContent).toString('base64'),
            encoding: 'base64'
          })
        })
        .mockResolvedValueOnce({ // documentation directory (not found)
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({ // doc directory (not found)
          ok: false,
          status: 404
        });

      const result = await service.findDocumentation('testuser/test-repo');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('## api.md');
      expect(result[0]).toContain(apiContent);
      expect(result[1]).toContain('## guide.md');
      expect(result[1]).toContain(guideContent);
    });

    it('should filter for documentation file extensions', async () => {
      const mockMixedFiles = [
        {
          name: 'api.md',
          path: 'docs/api.md',
          type: 'file',
          download_url: 'https://example.com/api.md',
          size: 1024
        },
        {
          name: 'config.json',
          path: 'docs/config.json',
          type: 'file',
          download_url: 'https://example.com/config.json',
          size: 512
        },
        {
          name: 'readme.txt',
          path: 'docs/readme.txt',
          type: 'file',
          download_url: 'https://example.com/readme.txt',
          size: 256
        }
      ];

      const apiContent = '# API Documentation';
      const txtContent = 'Text documentation';

      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // docs directory
          ok: true,
          json: () => Promise.resolve(mockMixedFiles)
        })
        .mockResolvedValueOnce({ // api.md content
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from(apiContent).toString('base64'),
            encoding: 'base64'
          })
        })
        .mockResolvedValueOnce({ // readme.txt content
          ok: true,
          json: () => Promise.resolve({
            content: Buffer.from(txtContent).toString('base64'),
            encoding: 'base64'
          })
        })
        .mockResolvedValue({ ok: false, status: 404 }); // other directories

      const result = await service.findDocumentation('testuser/test-repo');
      
      expect(result).toHaveLength(2);
      expect(result.some(doc => doc.includes('api.md'))).toBe(true);
      expect(result.some(doc => doc.includes('readme.txt'))).toBe(true);
      expect(result.some(doc => doc.includes('config.json'))).toBe(false);
    });

    it('should return empty array when no documentation found', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const result = await service.findDocumentation('testuser/test-repo');
      
      expect(result).toEqual([]);
    });
  });

  describe('extractRepositoryContent', () => {
    it('should extract complete repository content', async () => {
      const encodedReadme = Buffer.from(mockReadmeContent).toString('base64');
      const docContent = '# API Documentation\nAPI details...';
      const encodedDoc = Buffer.from(docContent).toString('base64');

      const mockDocsFiles = [{
        name: 'api.md',
        path: 'docs/api.md',
        type: 'file',
        download_url: 'https://example.com/api.md',
        size: 1024
      }];

      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // repository info
          ok: true,
          json: () => Promise.resolve(mockGitHubRepo)
        })
        .mockResolvedValueOnce({ // README.md
          ok: true,
          json: () => Promise.resolve({
            content: encodedReadme,
            encoding: 'base64'
          })
        })
        .mockResolvedValueOnce({ // docs directory
          ok: true,
          json: () => Promise.resolve(mockDocsFiles)
        })
        .mockResolvedValueOnce({ // api.md content
          ok: true,
          json: () => Promise.resolve({
            content: encodedDoc,
            encoding: 'base64'
          })
        })
        .mockResolvedValue({ ok: false, status: 404 }); // other doc directories

      const result = await service.extractRepositoryContent('testuser/test-repo');
      
      expect(result.repository).toEqual(mockGitHubRepo);
      expect(result.readmeContent).toBe(mockReadmeContent);
      expect(result.docsContent).toHaveLength(1);
      expect(result.docsContent[0]).toContain('## api.md');
      expect(result.docsContent[0]).toContain(docContent);
      expect(result.hasDocumentation).toBe(true);
    });

    it('should handle repository without documentation', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // repository info
          ok: true,
          json: () => Promise.resolve(mockGitHubRepo)
        })
        .mockResolvedValue({ ok: false, status: 404 }); // no README or docs

      const result = await service.extractRepositoryContent('testuser/test-repo');
      
      expect(result.repository).toEqual(mockGitHubRepo);
      expect(result.readmeContent).toBeNull();
      expect(result.docsContent).toEqual([]);
      expect(result.hasDocumentation).toBe(false);
    });

    it('should handle inaccessible repository', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      // The error thrown by getRepository will be "Repository not found or not accessible"
      // which then gets propagated up by extractRepositoryContent
      await expect(service.extractRepositoryContent('nonexistent/repo'))
        .rejects.toThrow('Repository not found or not accessible');
    });
  });

  describe('testConnection', () => {
    it('should return true for valid connection', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/user': { login: 'testuser' }
      });

      const result = await service.testConnection();
      
      expect(result).toBe(true);
    });

    it('should return false for invalid connection', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/user': {
          ok: false,
          status: 401
        }
      });

      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(service.getRepository('testuser/test-repo'))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle rate limiting gracefully', async () => {
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo': {
          ok: false,
          status: 429
        }
      });

      await expect(service.getRepository('testuser/test-repo'))
        .rejects.toThrow('GitHub API error: 429');
    });

    it('should handle very large file content', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB content
      const encodedContent = Buffer.from(largeContent).toString('base64');
      
      restoreFetch = mockFetch({
        'https://api.github.com/repos/testuser/test-repo/contents/large.md': {
          content: encodedContent,
          encoding: 'base64'
        }
      });

      const result = await service.getFileContent('testuser/test-repo', 'large.md');
      
      expect(result).toBe(largeContent);
    });
  });
});