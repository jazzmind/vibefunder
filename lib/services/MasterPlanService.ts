import { z } from 'zod';
import AIService from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';

const MasterPlanSchema = z.object({
  purpose: z.string(),
  audience: z.array(z.string()).min(1),
  mustHaveFeatures: z.array(z.string()).min(1),
  niceToHaveFeatures: z.array(z.string()).optional().default([]),
  gaps: z.array(z.string()).optional().default([]),
  competitorAnalysis: z.object({
    summary: z.string(),
    competitors: z.array(z.object({ name: z.string(), notes: z.string().optional() })).optional().default([]),
  }),
  roadmapMilestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    acceptance: z.array(z.string()).min(1),
  })).min(1),
});

export type MasterPlan = z.infer<typeof MasterPlanSchema>;

export class MasterPlanService extends AIService {
  constructor() {
    super({ logPrefix: 'MasterPlan' });
  }

  async generate(input: {
    campaign: { title: string; summary: string; description: string };
    repoMd: { path: string; text: string }[];
    websiteText?: string;
    research?: Record<string, string>;
  }): Promise<MasterPlan> {
    const { campaign, repoMd, websiteText, research } = input;

    const mdBundle = repoMd
      .slice(0, 20)
      .map((f) => `# ${f.path}\n${f.text.substring(0, 5000)}`)
      .join('\n\n---\n\n');

    const sys = `You are a product strategy and software delivery consultant. Synthesize inputs into a concise master plan covering purpose, audience, features (must-have vs nice-to-have), gaps, competitor context, and a pragmatic milestone roadmap with acceptance.`;

    const user = `CAMPAIGN\nTitle: ${campaign.title}\nSummary: ${campaign.summary}\nDescription:\n${campaign.description}\n\nREPO DOCS (subset of .md):\n${mdBundle}\n\nWEBSITE (if any):\n${websiteText || ''}\n\nRESEARCH (optional):\n${research ? JSON.stringify(research).slice(0, 8000) : ''}\n\nPlease produce a JSON per schema with realistic, implementable recommendations.`;

    const result = await this.callAI(
      MODELS.best,
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      MasterPlanSchema,
      'Master Plan Generation',
      'master_plan'
    );

    return result;
  }
}

export default MasterPlanService;


