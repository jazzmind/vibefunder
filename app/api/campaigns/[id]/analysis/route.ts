import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Getting analysis for campaign ID:', id);
    
    const analysis = await prisma.campaignAnalysis.findUnique({
      where: { campaignId: id },
    });
    
    console.log('Found analysis:', analysis ? 'Yes' : 'No');
    
    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
    }
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Failed to get campaign analysis:', error);
    console.error('Error details:', error);
    return NextResponse.json({ error: 'Failed to get analysis' }, { status: 500 });
  }
}
