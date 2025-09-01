import { NextResponse } from 'next/server';
import CompetitorResearchService from '@/lib/services/CompetitorResearchService';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description: string | undefined = body?.description;
    const website_url: string | undefined = body?.website_url || body?.websiteUrl;
    const campaign_id: string | undefined = body?.campaign_id || body?.campaignId;
    
    if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
    
    const svc = new CompetitorResearchService();
    const data = await svc.research(description, website_url);
    
    // Store the competitor research if campaign_id is provided
    if (campaign_id) {
      try {
        await prisma.campaignAnalysis.upsert({
          where: { campaignId: campaign_id },
          update: {
            competitorResearch: data as any,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          },
          create: {
            campaignId: campaign_id,
            competitorResearch: data as any,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          }
        });
      } catch (error) {
        console.error('Failed to store competitor research:', error);
        // Don't fail the request if storage fails
      }
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'research_failed' }, { status: 500 });
  }
}


