import { NextResponse } from 'next/server';
import { getAggregate } from '@/lib/analyzerClient';
import MasterPlanService from '@/lib/services/MasterPlanService';
import CompetitorResearchService from '@/lib/services/CompetitorResearchService';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo_url: string | undefined = body?.repo_url || body?.repoUrl;
    const website_url: string | undefined = body?.website_url || body?.websiteUrl;
    const campaign = body?.campaign;
    const campaign_id: string | undefined = body?.campaign_id || body?.campaignId;
    
    if (!repo_url || !campaign?.title || !campaign?.summary || !campaign?.description) {
      return NextResponse.json({ error: 'repo_url and campaign{title,summary,description} required' }, { status: 400 });
    }
    
    const agg = await getAggregate({ repo_url, website_url });
    const repoMd = Array.isArray(agg?.md_files) ? agg.md_files : [];
    
    // Optional competitor research via Perplexity if API key configured
    let research: Record<string, string> | undefined = undefined;
    if (process.env.PERPLEXITY_API_KEY) {
      try {
        const rs = new CompetitorResearchService();
        const r = await rs.research(`${campaign.title}: ${campaign.summary}`, website_url);
        research = { competitorOverview: r.content };
      } catch {}
    }
    
    const svc = new MasterPlanService();
    const plan = await svc.generate({ campaign, repoMd, websiteText: agg?.website_text, research });
    
    // Store the master plan if campaign_id is provided
    if (campaign_id) {
      try {
        await prisma.campaignAnalysis.upsert({
          where: { campaignId: campaign_id },
          update: {
            masterPlan: plan as any,
            repoUrl: repo_url,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          },
          create: {
            campaignId: campaign_id,
            masterPlan: plan as any,
            repoUrl: repo_url,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          }
        });
      } catch (error) {
        console.error('Failed to store master plan:', error);
        // Don't fail the request if storage fails
      }
    }
    
    return NextResponse.json(plan);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'master_plan_failed' }, { status: 500 });
  }
}


