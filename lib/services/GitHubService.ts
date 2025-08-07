import { z } from 'zod';

// GitHub API response schemas
const GitHubFileSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['file', 'dir']),
  content: z.string().optional(),
  download_url: z.string().nullable(),
  size: z.number()
});

const GitHubRepositorySchema = z.object({
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string(),
  default_branch: z.string(),
  language: z.string().nullable(),
  topics: z.array(z.string()).default([])
});

export type GitHubFile = z.infer<typeof GitHubFileSchema>;
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

interface RepositoryContent {
  repository: GitHubRepository;
  readmeContent: string | null;
  docsContent: string[];
  hasDocumentation: boolean;
}

/**
 * Service for interacting with GitHub API and extracting repository content
 */
export class GitHubService {
  private baseUrl = 'https://api.github.com';

  constructor(private token?: string) {}

  /**
   * Extract repository URL components
   */
  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
    try {
      // Handle various GitHub URL formats
      const patterns = [
        /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
        /^([^\/]+)\/([^\/]+)$/ // owner/repo format
      ];

      let match = null;
      for (const pattern of patterns) {
        match = repoUrl.match(pattern);
        if (match) break;
      }

      if (!match) return null;

      return {
        owner: match[1],
        repo: match[2]
      };
    } catch (error) {
      console.error('Error parsing repository URL:', error);
      return null;
    }
  }

  /**
   * Get repository information
   */
  async getRepository(repoUrl: string): Promise<GitHubRepository | null> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) return null;

    try {
      const response = await fetch(`${this.baseUrl}/repos/${parsed.owner}/${parsed.repo}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found or not accessible');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return GitHubRepositorySchema.parse(data);
    } catch (error) {
      console.error('Error fetching repository:', error);
      throw error;
    }
  }

  /**
   * Get repository contents
   */
  async getRepositoryContents(repoUrl: string, path = ''): Promise<GitHubFile[]> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data.map(item => GitHubFileSchema.parse(item)) : [];
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      return [];
    }
  }

  /**
   * Get file content from GitHub
   */
  async getFileContent(repoUrl: string, filePath: string): Promise<string | null> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${parsed.owner}/${parsed.repo}/contents/${filePath}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      console.error('Error fetching file content:', error);
      return null;
    }
  }

  /**
   * Find README file in repository
   */
  async findReadme(repoUrl: string): Promise<string | null> {
    const readmePatterns = [
      'README.md',
      'readme.md',
      'Readme.md',
      'README.txt',
      'README',
      'readme'
    ];

    for (const pattern of readmePatterns) {
      const content = await this.getFileContent(repoUrl, pattern);
      if (content) return content;
    }

    return null;
  }

  /**
   * Find documentation files
   */
  async findDocumentation(repoUrl: string): Promise<string[]> {
    const docsContent: string[] = [];
    
    // Check common documentation paths
    const docPaths = ['docs', 'documentation', 'doc'];
    
    for (const path of docPaths) {
      const contents = await this.getRepositoryContents(repoUrl, path);
      
      for (const file of contents) {
        if (file.type === 'file' && file.name.match(/\.(md|txt|rst)$/i)) {
          const content = await this.getFileContent(repoUrl, file.path);
          if (content) {
            docsContent.push(`## ${file.name}\n\n${content}`);
          }
        }
      }
    }

    return docsContent;
  }

  /**
   * Extract all relevant content from repository for campaign generation
   */
  async extractRepositoryContent(repoUrl: string): Promise<RepositoryContent> {
    try {
      console.log(`🔍 Extracting content from repository: ${repoUrl}`);
      
      // Get repository metadata
      const repository = await this.getRepository(repoUrl);
      if (!repository) {
        throw new Error('Could not access repository');
      }

      // Get README content
      const readmeContent = await this.findReadme(repoUrl);
      
      // Get documentation content
      const docsContent = await this.findDocumentation(repoUrl);
      
      const hasDocumentation = !!readmeContent || docsContent.length > 0;

      console.log(`✅ Extracted content: README ${readmeContent ? 'found' : 'not found'}, ${docsContent.length} doc files`);

      return {
        repository,
        readmeContent,
        docsContent,
        hasDocumentation
      };
    } catch (error) {
      console.error('Error extracting repository content:', error);
      throw error;
    }
  }

  /**
   * Get headers for GitHub API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'VibeFunder-Campaign-Generator'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  /**
   * Test GitHub token validity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default GitHubService;