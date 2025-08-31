import { NextResponse } from 'next/server';
import CompetitorResearchService from '@/lib/services/CompetitorResearchService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description: string | undefined = body?.description;
    const website_url: string | undefined = body?.website_url || body?.websiteUrl;
    if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
    const svc = new CompetitorResearchService();
    const data = await svc.research(description, website_url);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'research_failed' }, { status: 500 });
  }
}


