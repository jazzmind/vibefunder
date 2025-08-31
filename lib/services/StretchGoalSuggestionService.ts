import { z } from 'zod';
import AIService, { AIResult } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';

// Input validation schema
const StretchGoalSuggestionInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary too long'),
  description: z.string().min(1, 'Description is required').max(50000, 'Description too long'),
  fundingGoal: z.number().positive('Funding goal must be positive').max(10000000, 'Funding goal too high'),
});

// Individual stretch goal schema
const StretchGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').describe(
    'Catchy, exciting name for the stretch goal that motivates backers'
  ),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long').describe(
    'Detailed explanation of what backers get and why it\'s valuable'
  ),
  targetDollars: z.number().positive('Target amount must be positive').describe(
    'Funding target in dollars (should be 20-50% above the previous goal)'
  ),
  reason: z.string().min(1, 'Reason is required').max(300, 'Reason too long').describe(
    'Explanation of why this stretch goal is appealing and achievable with additional funding'
  ),
});

const StretchGoalSuggestionResponseSchema = z.object({
  stretchGoals: z.array(StretchGoalSchema).min(3).max(5).describe(
    'Array of 3-4 compelling stretch goals that motivate additional funding'
  )
}).describe('Stretch goal suggestions response');

export type StretchGoalSuggestionInput = z.infer<typeof StretchGoalSuggestionInputSchema>;
export type SuggestedStretchGoal = z.infer<typeof StretchGoalSchema>;
export type StretchGoalSuggestionResponse = z.infer<typeof StretchGoalSuggestionResponseSchema>;

/**
 * Service for generating stretch goal suggestions using AI
 */
export class StretchGoalSuggestionService extends AIService {
  constructor() {
    super({
      logPrefix: 'StretchGoalSuggestion',
      timeoutMs: 30000,
    });
  }

  /**
   * Generate stretch goal suggestions for a campaign
   */
  async suggestStretchGoals(input: StretchGoalSuggestionInput): Promise<AIResult<StretchGoalSuggestionResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, StretchGoalSuggestionInputSchema, 'suggestStretchGoals');

    const systemMessage = `You are an expert crowdfunding strategist who creates compelling stretch goals that motivate backers to contribute beyond the base funding goal. Design stretch goals that are exciting, valuable, and logically connected to the main project.

STRETCH GOAL STRATEGY:
- Create excitement and FOMO (fear of missing out)
- Appeal to different backer motivations (features, scale, exclusivity, impact)
- Progressively more ambitious but realistically achievable
- Logically connected to and enhance the core project
- Provide clear value proposition for additional funding

FUNDING PROGRESSION:
- First stretch goal: 120-150% of base goal
- Subsequent goals: Increase by 20-40% from previous goal
- Consider diminishing returns - later goals should be proportionally more valuable
- Maximum recommended: 300% of base goal

STRETCH GOAL TYPES:
1. Feature Enhancements (new capabilities, premium features)
2. Scale Improvements (more users, better performance, larger scope)
3. Platform Expansion (additional platforms, integrations)
4. Premium Content (exclusive features, early access, special editions)
5. Community Benefits (events, merchandise, recognition)
6. Future Development (roadmap acceleration, additional modules)

VALUE PROPOSITION:
- Each goal should provide tangible benefits to all backers
- Clear explanation of how additional funding enables the enhancement
- Excitement factor that makes backers want to share and promote
- Realistic timeline and delivery expectations`;

    const userMessage = `Campaign Title: ${validatedInput.title}

Campaign Summary: ${validatedInput.summary}

Campaign Description: ${validatedInput.description}

Base Funding Goal: $${validatedInput.fundingGoal.toLocaleString()}

Please suggest compelling stretch goals that will motivate backers to contribute beyond the base goal. Each goal should be exciting, valuable, and achievable with the additional funding. Start with 120-150% of the base goal and increase progressively.`;

    const operationName = 'Stretch Goal Generation';

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        StretchGoalSuggestionResponseSchema,
        operationName,
        'stretch_goal_suggestions'
      );

      // Validate funding progression
      const baseGoal = validatedInput.fundingGoal;
      let previousTarget = baseGoal;
      
      result.stretchGoals.forEach((goal, index) => {
        const increase = ((goal.targetDollars - previousTarget) / previousTarget) * 100;
        if (index === 0 && (goal.targetDollars < baseGoal * 1.2 || goal.targetDollars > baseGoal * 1.5)) {
          this.log(`⚠️ First stretch goal (${goal.targetDollars}) should be 120-150% of base goal (${baseGoal})`, 'warn');
        }
        if (index > 0 && (increase < 15 || increase > 50)) {
          this.log(`⚠️ Stretch goal ${index + 1} increase (${increase.toFixed(1)}%) should be 20-40%`, 'warn');
        }
        previousTarget = goal.targetDollars;
      });

      this.log(`✅ Generated ${result.stretchGoals.length} stretch goals ranging from $${result.stretchGoals[0]?.targetDollars.toLocaleString()} to $${result.stretchGoals[result.stretchGoals.length - 1]?.targetDollars.toLocaleString()}`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Stretch goal suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export default StretchGoalSuggestionService;