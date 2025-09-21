import { NextResponse } from 'next/server';
import { featureScan } from '@/lib/analyzerClient';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repo_url: string | undefined = body?.repo_url || body?.repoUrl;
    const features = Array.isArray(body?.features) ? body.features : [];
    const campaign_id: string | undefined = body?.campaign_id || body?.campaignId;
    
    if (!repo_url || features.length === 0) return NextResponse.json({ error: 'repo_url and features required' }, { status: 400 });
    
    const data = await featureScan({ repo_url, features, branch: body?.branch, github_token: body?.github_token });
    
    // Store the feature scan if campaign_id is provided
    if (campaign_id) {
      try {
        await prisma.campaignAnalysis.upsert({
          where: { campaignId: campaign_id },
          update: {
            featureScan: data as any,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          },
          create: {
            campaignId: campaign_id,
            featureScan: data as any,
            repoUrl: repo_url,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          }
        });
      } catch (error) {
        console.error('Failed to store feature scan:', error);
        // Don't fail the request if storage fails
      }
    }
    
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'features_failed' }, { status: 500 });
  }
}


