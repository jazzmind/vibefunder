import { NextResponse } from 'next/server';
import { getSow } from '@/lib/analyzerClient';
import { prisma } from '@/lib/db';
import { URL } from 'url';

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  try {
    const data = await getSow(jobId);
    
    // Try to store SOW if campaign_id is provided in query params
    const url = new URL(request.url);
    const campaign_id = url.searchParams.get('campaign_id') || url.searchParams.get('campaignId');
    
    if (campaign_id && data.sow_markdown) {
      try {
        await prisma.campaignAnalysis.upsert({
          where: { campaignId: campaign_id },
          update: {
            sowMarkdown: data.sow_markdown,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          },
          create: {
            campaignId: campaign_id,
            sowMarkdown: data.sow_markdown,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          }
        });
      } catch (error) {
        console.error('Failed to store SOW:', error);
        // Don't fail the request if storage fails
      }
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sow_failed' }, { status: 500 });
  }
}


