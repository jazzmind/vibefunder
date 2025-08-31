import { z } from 'zod';
import AIService, { AIResult } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';

// Input validation schema
const ContentEnhancementInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().min(1, 'Summary is required').max(500, 'Summary too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
});

// Output schema for AI suggestions
const ContentSuggestionSchema = z.object({
  type: z.enum(['addition', 'modification', 'restructure'], {
    description: 'Type of content enhancement suggestion'
  }),
  section: z.string().min(1, 'Section description is required').describe(
    'Brief description of the content area being enhanced'
  ),
  originalText: z.string().min(1, 'Original text is required').describe(
    'The exact text from the content that should be replaced (must exist in content)'
  ),
  enhancedText: z.string().min(1, 'Enhanced text is required').describe(
    'The improved version of the text'
  ),
  reason: z.string().min(1, 'Reason is required').describe(
    'Clear explanation of why this improvement helps the campaign'
  ),
});

const ContentEnhancementResponseSchema = z.object({
  suggestions: z.array(ContentSuggestionSchema).min(1).max(8).describe(
    'Array of 3-5 specific, actionable content enhancement suggestions'
  )
}).describe('Content enhancement suggestions response');

export type ContentEnhancementInput = z.infer<typeof ContentEnhancementInputSchema>;
export type ContentSuggestion = z.infer<typeof ContentSuggestionSchema>;
export type ContentEnhancementResponse = z.infer<typeof ContentEnhancementResponseSchema>;

/**
 * Service for enhancing campaign content using AI
 */
export class ContentEnhancementService extends AIService {
  constructor() {
    super({
      logPrefix: 'ContentEnhancement',
      timeoutMs: 45000, // Longer timeout for content analysis
    });
  }

  /**
   * Generate content enhancement suggestions for a campaign
   */
  async enhanceContent(input: ContentEnhancementInput): Promise<AIResult<ContentEnhancementResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, ContentEnhancementInputSchema, 'enhanceContent');

    const systemMessage = `You are an expert campaign content writer and strategist. Analyze the given campaign content and suggest specific improvements that will make it more engaging, persuasive, and professional.

ANALYSIS FOCUS:
- Making content more engaging and persuasive
- Improving clarity and readability  
- Adding compelling details or benefits
- Better structure and flow
- More professional tone
- Stronger calls to action
- Better storytelling elements

CONTENT TYPES:
- If content appears to be rough notes: Suggest complete restructuring with compelling narrative
- If content is structured: Suggest specific improvements to existing sections
- Always ensure suggestions match actual text that exists in the content

REQUIREMENTS:
- Only suggest changes for text that actually exists in the content
- Provide 3-5 specific, actionable suggestions
- Each suggestion must include exact original text to be replaced
- Focus on high-impact improvements
- Ensure suggestions are realistic and achievable`;

    const userMessage = `Campaign Title: "${validatedInput.title}"

Campaign Summary: "${validatedInput.summary}"

Campaign Narrative (Detailed Description):
${validatedInput.content}

Please analyze ALL THREE sections (title, summary, and narrative) and provide specific enhancement suggestions. For each suggestion, ensure the originalText exactly matches text that exists in one of these sections. Be specific about which section you're targeting in your suggestions.`;

    const operationName = 'Content Enhancement Analysis';

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        ContentEnhancementResponseSchema,
        operationName,
        'content_suggestions'
      );

      this.log(`✅ Generated ${result.suggestions.length} content suggestions`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Content enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export default ContentEnhancementService;