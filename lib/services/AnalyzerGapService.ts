import { z } from 'zod';
import AIService, { AIResult } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';

const FindingSchema = z.object({
  scanner: z.enum(['semgrep','gitleaks','sbom']).describe('Source scanner'),
  title: z.string(),
  severity: z.enum(['critical','high','medium','low','info']).nullable(),
  ruleId: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string(),
});

const MilestoneSchema = z.object({
  title: z.string(),
  description: z.string(),
  acceptance: z.array(z.string()).min(1),
  scope: z.array(z.string()).min(1),
  relatedFindings: z.array(FindingSchema).default([]),
});

const GapAnalysisResponseSchema = z.object({
  milestones: z.array(MilestoneSchema).min(1),
  notes: z.string().default(''),
});

export type GapAnalysisResponse = z.infer<typeof GapAnalysisResponseSchema>;

export class AnalyzerGapService extends AIService {
  constructor() {
    super({ logPrefix: 'AnalyzerGap' });
  }

  async generateFromSarif(input: {
    repoUrl: string;
    semgrepSarif?: string;
    gitleaksSarif?: string;
    grypeSarif?: string;
  }): Promise<AIResult<GapAnalysisResponse>> {
    const { repoUrl, semgrepSarif, gitleaksSarif, grypeSarif } = input;

    const system = `You are a senior security and reliability consultant. Given SARIF scanner outputs, produce a practical gap analysis with concrete milestones and scopes suitable for service providers. Align acceptance with OWASP ASVS L1-L2 spirit. Keep output concise and actionable. Always populate all fields required by the schema; when a value is unknown, use null (for fields that allow null) or an empty array/string as appropriate.`;

    const user = `Repository: ${repoUrl}

Inputs (SARIF JSON strings; may be empty):
- Semgrep: ${semgrepSarif ? 'provided' : 'none'}
- Gitleaks: ${gitleaksSarif ? 'provided' : 'none'}
- Grype: ${grypeSarif ? 'provided' : 'none'}

Please:
1) Synthesize the findings into 3-6 milestones with acceptance criteria and scope bullets.
2) Reference influential findings in relatedFindings with scanner, title, severity if available, ruleId if available.
3) Prefer remediation categories: SAST fixes, secrets hygiene, dependency upgrades, CI gates, SBOM+vuln policy, authZ/authN checks, telemetry.
4) Avoid vendor-specific advice; keep it implementation-agnostic.

SARIF (as plain JSON strings):
SEMGRP=${semgrepSarif || ''}
GITLEAKS=${gitleaksSarif || ''}
GRYPE=${grypeSarif || ''}`;

    const data = await this.callAI(
      MODELS.best,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      GapAnalysisResponseSchema,
      'Gap Analysis from SARIF',
      'gap_analysis'
    ) as GapAnalysisResponse;

    return {
      data,
      metadata: { executionTimeMs: 0, retries: 0, model: MODELS.best },
    };
  }
}

export default AnalyzerGapService;


