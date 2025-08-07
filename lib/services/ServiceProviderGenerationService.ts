import { z } from 'zod';
import AIService, { AIResult } from '../aiService';
import { MODELS } from '../models';

// Reuse the search functionality from ProposalHub
import { searchPerplexity } from '../search/base';

// Input validation schema
const ServiceProviderInputSchema = z.object({
  domain: z.string().url("Valid domain URL is required"),
  userPrompt: z.string().default('').describe('Additional context about the service provider')
});

// Output schema for generated service provider
const GeneratedServiceProviderSchema = z.object({
  name: z.string().min(1).max(200).describe('Company/organization name'),
  description: z.string().min(50).max(1000).describe('Comprehensive service description'),
  website: z.string().url().describe('Primary website URL'),
  services: z.array(z.string()).min(1).max(10).describe('List of primary services offered'),
  sectors: z.array(z.string()).min(1).max(5).describe('Industry sectors served'),
  size: z.string().describe('Company size (e.g., "10-50 employees", "Enterprise")'),
  location: z.string().nullable().describe('Primary business location'),
  founded: z.string().nullable().describe('Year founded or establishment date'),
  specialties: z.array(z.string()).max(8).describe('Key specialties and expertise areas'),
  targetMarket: z.string().describe('Primary target market and customer base'),
  valueProposition: z.string().min(50).max(300).describe('Core value proposition'),
  contactInfo: z.object({
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable()
  }).nullable(),
  socialMedia: z.object({
    linkedin: z.string().url().nullable(),
    twitter: z.string().url().nullable(),
    facebook: z.string().url().nullable()
  }).nullable(),
  certifications: z.array(z.string()).describe('Professional certifications or accreditations'),
  awards: z.array(z.string()).describe('Notable awards or recognition'),
  keyPersonnel: z.array(z.object({
    name: z.string(),
    role: z.string(),
    background: z.string().nullable()
  })).describe('Key team members or leadership')
});

export type ServiceProviderInput = z.infer<typeof ServiceProviderInputSchema>;
export type GeneratedServiceProvider = z.infer<typeof GeneratedServiceProviderSchema>;

/**
 * Service for generating service provider profiles from domain using AI and web search
 */
export class ServiceProviderGenerationService extends AIService {
  constructor() {
    super({
      logPrefix: 'ServiceProviderGeneration',
      timeoutMs: 45000, // Extended timeout for web research
    });
  }

  /**
   * Generate a comprehensive service provider profile from domain
   */
  async generateServiceProvider(input: ServiceProviderInput): Promise<AIResult<GeneratedServiceProvider>> {
    // Validate and normalize input
    const validatedInput = ServiceProviderInputSchema.parse(input);

    try {
      // Step 1: Research the company using Perplexity
      console.log(`🔍 Researching company at domain: ${validatedInput.domain}`);
      const companyResearch = await this.researchCompany(validatedInput.domain);

      // Step 2: Generate structured service provider profile
      console.log(`🤖 Generating service provider profile`);
      const serviceProviderResult = await this.generateStructuredProfile(companyResearch, validatedInput);

      return serviceProviderResult;
    } catch (error) {
      console.error('Error generating service provider profile:', error);
      throw error;
    }
  }

  /**
   * Research company using Perplexity search
   */
  private async researchCompany(domain: string): Promise<string> {
    const model = MODELS.perplexity;
    
    const systemPrompt = `You are a business intelligence researcher. Research the company associated with the given domain and provide comprehensive information about their business, services, team, and market position.`;
    
    const userPrompt = `Research the company at domain "${domain}" and provide detailed information including:

1. Company name and basic information
2. Primary services and offerings
3. Industry sectors and target markets
4. Company size and location
5. Key personnel and leadership team
6. Specialties and expertise areas
7. Value proposition and competitive advantages
8. Contact information if available
9. Social media presence
10. Certifications, awards, or notable achievements
11. Recent news or developments
12. Customer testimonials or case studies (if available)

Please provide comprehensive, factual information based on publicly available sources. Focus on information that would be relevant for creating a professional service provider profile.`;

    try {
      const research = await searchPerplexity(model, systemPrompt, userPrompt);
      return research;
    } catch (error) {
      console.error('Error researching company:', error);
      throw new Error('Failed to research company information');
    }
  }

  /**
   * Generate structured service provider profile from research
   */
  private async generateStructuredProfile(
    research: string, 
    input: ServiceProviderInput
  ): Promise<AIResult<GeneratedServiceProvider>> {
    const systemMessage = `You are a professional service provider profile generator. Based on research data, create a comprehensive, accurate service provider profile that would be suitable for a business directory or marketplace.

PROFILE CREATION PRINCIPLES:
- Use only factual information from the research
- Create compelling but accurate descriptions
- Focus on professional credibility and expertise
- Highlight unique value propositions
- Ensure all information is verifiable and realistic
- Use professional language suitable for B2B contexts

COMPLETENESS REQUIREMENTS:
- Fill all required fields with researched information
- Use "Not specified" or omit optional fields if information unavailable
- Ensure consistency across all profile elements
- Create realistic and professional content
- Maintain factual accuracy while making content engaging`;

    const userMessage = `Based on the following company research, create a comprehensive service provider profile:

## Company Research Data
${research}

## Domain
${input.domain}

${input.userPrompt ? `## Additional Context
${input.userPrompt}` : ''}

Create a structured service provider profile that accurately represents this company's capabilities and positioning. Ensure all information is factual and professionally presented.`;

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        GeneratedServiceProviderSchema,
        'Service Provider Profile Generation',
        'service_provider_generation'
      );

      this.log(`✅ Generated service provider profile for: ${result.name}`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Service provider generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Enhance an existing service provider profile with additional research
   */
  async enhanceServiceProvider(
    existingProvider: {
      name: string;
      description?: string;
      website: string;
    },
    additionalContext?: string
  ): Promise<AIResult<GeneratedServiceProvider>> {
    const enhancementInput: ServiceProviderInput = {
      domain: existingProvider.website,
      userPrompt: additionalContext || ''
    };

    // Research the company again for updated information
    const research = await this.researchCompany(existingProvider.website);

    const enhancementSystemMessage = `You are enhancing an existing service provider profile with updated research. Maintain the core identity while adding new insights, correcting any inaccuracies, and expanding the profile with additional relevant information.

ENHANCEMENT GOALS:
- Preserve accurate existing information
- Add new insights from research
- Correct any outdated or inaccurate details
- Expand profile completeness
- Maintain professional consistency`;

    const enhancementUserMessage = `Enhance this existing service provider profile with updated research:

## Existing Profile
**Name:** ${existingProvider.name}
**Website:** ${existingProvider.website}
**Description:** ${existingProvider.description || 'No description provided'}

## Updated Research
${research}

${additionalContext ? `## Additional Context: ${additionalContext}` : ''}

Create an enhanced profile that incorporates new information while maintaining accuracy and professionalism.`;

    try {
      const result = await this.callAI(
        MODELS.best,
        [
          { role: 'system', content: enhancementSystemMessage },
          { role: 'user', content: enhancementUserMessage }
        ],
        GeneratedServiceProviderSchema,
        'Service Provider Profile Enhancement',
        'service_provider_enhancement'
      );

      this.log(`✅ Enhanced service provider profile for: ${result.name}`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now(),
          retries: 0,
          model: MODELS.best
        }
      };
    } catch (error) {
      this.log(`❌ Service provider enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export default ServiceProviderGenerationService;