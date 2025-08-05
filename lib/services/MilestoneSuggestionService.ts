import { z } from 'zod';
import AIService, { AIResult } from '../aiService';

// Input validation schema
const MilestoneSuggestionInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary too long'),
  description: z.string().min(1, 'Description is required').max(50000, 'Description too long'),
  fundingGoal: z.number().positive('Funding goal must be positive').max(10000000, 'Funding goal too high'),
});

// Milestone acceptance criteria schema
const AcceptanceCriteriaSchema = z.object({
  checklist: z.array(z.string().min(1, 'Checklist item cannot be empty')).min(2).max(6).describe(
    'Array of 3-4 specific, measurable criteria that define milestone completion'
  ),
});

// Individual milestone schema
const MilestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required').max(100, 'Milestone name too long').describe(
    'Clear, descriptive name for the milestone that indicates the deliverable'
  ),
  pct: z.number().min(1, 'Percentage must be at least 1').max(100, 'Percentage cannot exceed 100').describe(
    'Percentage of total project completion this milestone represents'
  ),
  acceptance: AcceptanceCriteriaSchema.describe(
    'Specific criteria that must be met to consider this milestone complete'
  ),
  reason: z.string().min(1, 'Reason is required').max(300, 'Reason too long').describe(
    'Brief explanation of why this milestone is important for project success'
  ),
});

const MilestoneSuggestionResponseSchema = z.object({
  milestones: z.array(MilestoneSchema).min(3).max(6).describe(
    'Array of 3-5 logical milestones that break down the project development lifecycle'
  )
}).describe('Milestone suggestions response');

export type MilestoneSuggestionInput = z.infer<typeof MilestoneSuggestionInputSchema>;
export type MilestoneAcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>;
export type SuggestedMilestone = z.infer<typeof MilestoneSchema>;
export type MilestoneSuggestionResponse = z.infer<typeof MilestoneSuggestionResponseSchema>;

/**
 * Service for generating milestone suggestions using AI
 */
export class MilestoneSuggestionService extends AIService {
  constructor() {
    super({
      logPrefix: 'MilestoneSuggestion',
      timeoutMs: 30000,
    });
  }

  /**
   * Generate milestone suggestions for a campaign
   */
  async suggestMilestones(input: MilestoneSuggestionInput): Promise<AIResult<MilestoneSuggestionResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, MilestoneSuggestionInputSchema, 'suggestMilestones');

    const systemMessage = `You are an expert project manager who creates realistic, achievable campaign milestones. Based on the campaign information, suggest 3-5 logical milestones that break down the project development into manageable phases.

MILESTONE REQUIREMENTS:
- Realistic and achievable within the funding scope
- Properly sequenced in logical development order
- Specific and measurable with clear deliverables
- Appropriate for the funding goal and project complexity
- Cover the full development lifecycle from concept to completion

PERCENTAGE ALLOCATION:
- All milestone percentages must add up to exactly 100%
- Early milestones: 15-25% (planning, setup, initial development)
- Middle milestones: 20-35% (core development, testing)
- Final milestones: 25-40% (completion, launch, polish)

ACCEPTANCE CRITERIA:
- Each milestone must have 3-4 specific, measurable criteria
- Criteria should be objective and verifiable
- Include both technical and business deliverables
- Consider user testing, documentation, and quality assurance

PROJECT LIFECYCLE PHASES:
1. Planning & Setup (requirements, design, infrastructure)
2. Core Development (main features, functionality)
3. Testing & Refinement (QA, user feedback, improvements)
4. Launch Preparation (deployment, documentation, marketing)
5. Post-Launch Support (monitoring, bug fixes, optimization)`;

    const userMessage = `Campaign Title: ${validatedInput.title}

Campaign Summary: ${validatedInput.summary}

Campaign Description: ${validatedInput.description}

Funding Goal: $${validatedInput.fundingGoal.toLocaleString()}

Please suggest appropriate milestones that break down this project into logical, achievable phases. Ensure percentages add up to 100% and each milestone has clear, measurable acceptance criteria.`;

    const operationName = 'Milestone Generation';

    try {
      const result = await this.callAI(
        'gpt-4o',
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        MilestoneSuggestionResponseSchema,
        operationName,
        'milestone_suggestions'
      );

      // Validate that percentages add up to 100%
      const totalPct = result.milestones.reduce((sum, milestone) => sum + milestone.pct, 0);
      if (Math.abs(totalPct - 100) > 1) { // Allow 1% tolerance for rounding
        this.log(`⚠️ Milestone percentages don't add up to 100% (total: ${totalPct}%)`, 'warn');
      }

      this.log(`✅ Generated ${result.milestones.length} milestones with ${totalPct}% total coverage`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: 'gpt-4o'
        }
      };
    } catch (error) {
      this.log(`❌ Milestone suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export default MilestoneSuggestionService;