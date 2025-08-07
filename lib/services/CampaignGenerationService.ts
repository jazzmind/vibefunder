import { z } from 'zod';
import AIService, { AIResult } from '../aiService';
import { MODELS } from '../models';

// Input validation schema
const CampaignGenerationInputSchema = z.object({
  repository: z.object({
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
    html_url: z.string(),
    language: z.string().nullable(),
    topics: z.array(z.string()).default([])
  }),
  readmeContent: z.string().nullable(),
  docsContent: z.array(z.string()).default([]),
  userPrompt: z.string().default('').describe('Additional context or requirements from the user')
});

// Output schema for generated campaign
const GeneratedCampaignSchema = z.object({
  title: z.string().min(1).max(200).describe('Compelling campaign title'),
  summary: z.string().min(50).max(500).describe('Engaging campaign summary/tagline'),
  description: z.string().min(200).describe('Detailed campaign description with compelling narrative'),
  fundingGoalDollars: z.number().min(1000).max(10000000).describe('Realistic funding goal in USD'),
  sectors: z.array(z.string()).min(1).max(5).describe('Relevant industry sectors'),
  deployModes: z.array(z.string()).max(3).describe('Deployment/distribution methods'),
  tags: z.array(z.string()).min(2).max(10).describe('Relevant tags for discovery'),
  milestones: z.array(z.object({
    name: z.string().min(1).max(200),
    pct: z.number().min(5).max(100),
    dueDate: z.string().nullable().describe('Relative timeframe (e.g., "3 months", "6 months")'),
    acceptance: z.object({
      criteria: z.string().min(10),
      deliverables: z.array(z.string())
    })
  })).min(2).max(6).describe('Project milestones with funding percentages'),
  pledgeTiers: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(10).max(500),
    amountDollars: z.number().min(1),
    order: z.number().min(1),
    estimatedDelivery: z.string().describe('Relative timeframe for delivery')
  })).min(2).max(8).describe('Compelling pledge tiers with clear value propositions')
});

export type CampaignGenerationInput = z.infer<typeof CampaignGenerationInputSchema>;
export type GeneratedCampaign = z.infer<typeof GeneratedCampaignSchema>;

/**
 * Service for generating campaign content from GitHub repository data using AI
 */
export class CampaignGenerationService extends AIService {
  constructor() {
    super({
      logPrefix: 'CampaignGeneration',
      timeoutMs: 60000, // Extended timeout for comprehensive analysis
    });
  }

  /**
   * Generate a complete campaign from repository content
   */
  async generateCampaign(input: CampaignGenerationInput): Promise<AIResult<GeneratedCampaign>> {
    // Validate and normalize input
    const validatedInput = CampaignGenerationInputSchema.parse(input);

    const systemMessage = `You are an expert crowdfunding campaign strategist and technical project analyst. Your job is to create compelling, professional campaign content from a GitHub repository.

ANALYSIS APPROACH:
1. Analyze the repository structure, code, and documentation
2. Identify the project's purpose, target audience, and unique value proposition
3. Assess technical complexity and development roadmap
4. Create compelling campaign narrative that appeals to both technical and non-technical backers
5. Generate realistic funding goals, milestones, and pledge tiers

CAMPAIGN CREATION PRINCIPLES:
- Make technical projects accessible to general audiences
- Highlight real-world benefits and use cases
- Create compelling narrative arc (problem → solution → impact)
- Set realistic and achievable funding goals
- Design milestone structure that shows clear progress
- Create pledge tiers with genuine value for backers

FUNDING GOAL GUIDELINES:
- Solo developer projects: $5,000 - $50,000
- Small team projects: $25,000 - $150,000
- Complex platforms/tools: $100,000 - $500,000
- Hardware/physical products: $50,000 - $1,000,000
- Consider development time, team size, and market potential

MILESTONE STRUCTURE:
- Should total 100% and show clear development phases
- Early milestones (15-25%): Core foundation/MVP
- Mid milestones (25-40%): Key features and testing
- Final milestones (15-35%): Polish, documentation, deployment

PLEDGE TIER STRATEGY:
- Start with accessible tiers ($5-25) for supporters
- Include practical tiers ($50-200) with real value
- Add premium tiers ($500+) for serious users/organizations
- Ensure deliverables are achievable and valuable`;

    // Prepare repository analysis content
    const repoAnalysis = this.buildRepositoryAnalysis(validatedInput);

    const userMessage = `Please analyze this GitHub repository and create a compelling crowdfunding campaign:

${repoAnalysis}

${validatedInput.userPrompt ? `Additional Requirements: ${validatedInput.userPrompt}` : ''}

Create a comprehensive campaign that will attract both technical and non-technical backers. Focus on real-world impact and clear value propositions.`;

    const operationName = 'Campaign Generation from Repository';

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        GeneratedCampaignSchema,
        operationName,
        'campaign_generation'
      );

      this.log(`✅ Generated campaign: "${result.title}" with ${result.milestones.length} milestones and ${result.pledgeTiers.length} pledge tiers`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Campaign generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Build comprehensive repository analysis for AI processing
   */
  private buildRepositoryAnalysis(input: CampaignGenerationInput): string {
    const { repository, readmeContent, docsContent } = input;
    
    let analysis = `## Repository Overview
**Name:** ${repository.name}
**Full Name:** ${repository.full_name}
**URL:** ${repository.html_url}
**Primary Language:** ${repository.language || 'Not specified'}
**Description:** ${repository.description || 'No description provided'}
  **Topics/Tags:** ${repository.topics.length > 0 ? repository.topics.join(', ') : 'None specified'}

`;

    if (readmeContent) {
      analysis += `## README Content
${readmeContent}

`;
    }

    if (docsContent.length > 0) {
      analysis += `## Additional Documentation
${docsContent.join('\n\n')}

`;
    }

    // Add content analysis hints
    analysis += `## Analysis Guidelines
- Focus on the practical value and real-world applications
- Identify the target user base and their pain points
- Highlight technical innovation and unique features
- Consider market potential and competition
- Assess development complexity and required resources
- Create compelling story that connects with backers emotionally
`;

    return analysis;
  }

  /**
   * Enhance an existing campaign with repository insights
   */
  async enhanceCampaignWithRepo(
    existingCampaign: {
      title: string;
      summary: string;
      description?: string;
    },
    repoInput: CampaignGenerationInput
  ): Promise<AIResult<GeneratedCampaign>> {
    // Validate and normalize input
    const validatedRepoInput = CampaignGenerationInputSchema.parse(repoInput);
    const enhancementSystemMessage = `You are enhancing an existing campaign with technical insights from a GitHub repository. Maintain the campaign's core vision while adding technical credibility, development roadmap, and realistic implementation details.

ENHANCEMENT GOALS:
- Preserve the original campaign vision and tone
- Add technical depth and credibility
- Provide realistic development timeline
- Create compelling technical milestones
- Add repository-specific value propositions`;

    const enhancementUserMessage = `Enhance this existing campaign with insights from the linked repository:

## Existing Campaign
**Title:** ${existingCampaign.title}
**Summary:** ${existingCampaign.summary}
**Description:** ${existingCampaign.description || 'No description provided'}

## Repository Analysis
${this.buildRepositoryAnalysis(validatedRepoInput)}

Please create an enhanced version that combines the campaign vision with technical implementation details from the repository.`;

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: enhancementSystemMessage },
          { role: 'user', content: enhancementUserMessage }
        ],
        GeneratedCampaignSchema,
        'Campaign Enhancement with Repository',
        'campaign_enhancement'
      );

      this.log(`✅ Enhanced campaign with repository insights`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Campaign enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export default CampaignGenerationService;