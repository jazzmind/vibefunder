import { NextResponse } from 'next/server';
import { getJob, getReport } from '@/lib/analyzerClient';
import { AnalyzerGapService } from '@/lib/services/AnalyzerGapService';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jobId: string | undefined = body?.job_id || body?.jobId;
    const repoUrl: string | undefined = body?.repo_url || body?.repoUrl;
    const campaign_id: string | undefined = body?.campaign_id || body?.campaignId;
    
    if (!jobId || !repoUrl) return NextResponse.json({ error: 'job_id and repo_url required' }, { status: 400 });

    const status = await getJob(jobId);
    const reports: Record<string, string> = {};
    const names = Array.isArray(status?.reports_present) ? status.reports_present as string[] : [];
    for (const n of names) {
      if (n.endsWith('.sarif') || n === 'semgrep.sarif' || n === 'gitleaks.sarif' || n === 'grype.sarif') {
        try {
          const r = await getReport(jobId, n);
          reports[n] = r.content;
        } catch {}
      }
    }

    const svc = new AnalyzerGapService();
    const result = await svc.generateFromSarif({
      repoUrl,
      semgrepSarif: reports['semgrep.sarif'],
      gitleaksSarif: reports['gitleaks.sarif'],
      grypeSarif: reports['grype.sarif'],
    });
    
    // Store the gap analysis if campaign_id is provided
    if (campaign_id) {
      try {
        await prisma.campaignAnalysis.upsert({
          where: { campaignId: campaign_id },
          update: {
            gapAnalysis: result.data as any,
            gapJobId: jobId,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          },
          create: {
            campaignId: campaign_id,
            gapAnalysis: result.data as any,
            gapJobId: jobId,
            repoUrl: repoUrl,
            lastAnalyzedAt: new Date(),
            analysisVersion: '1.0'
          }
        });
      } catch (error) {
        console.error('Failed to store gap analysis:', error);
        // Don't fail the request if storage fails
      }
    }
    
    return NextResponse.json(result.data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'gap_failed' }, { status: 500 });
  }
}


