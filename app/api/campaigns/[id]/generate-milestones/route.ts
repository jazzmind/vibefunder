import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get campaign with analysis
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { 
        analysis: true,
        milestones: true
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = campaign.makerId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin');
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if analysis and roadmapMilestones exist
    if (!campaign.analysis?.masterPlan) {
      return NextResponse.json({ 
        error: 'No master plan found. Please run analysis first.' 
      }, { status: 400 });
    }

    const masterPlan = campaign.analysis.masterPlan as any;
    const roadmapMilestones = masterPlan.roadmapMilestones;

    if (!roadmapMilestones || !Array.isArray(roadmapMilestones)) {
      return NextResponse.json({ 
        error: 'No roadmap milestones found in analysis.' 
      }, { status: 400 });
    }

    // Get SOW content if available
    const sowContent = campaign.analysis.sowMarkdown || '';

    // Convert roadmap milestones to campaign milestones
    const milestonesToCreate = roadmapMilestones.map((milestone: any, index: number) => {
      // Set all milestones to 0% completion (they haven't been started yet)
      const pct = 0;
      
      // Extract relevant SOW section for this milestone (basic approach)
      let sowSection = '';
      if (sowContent) {
        // Try to find SOW content related to this milestone
        const milestoneKeywords = milestone.title.toLowerCase().split(' ');
        const sowLines = sowContent.split('\n');
        const relevantLines = sowLines.filter(line => 
          milestoneKeywords.some((keyword: string) => 
            line.toLowerCase().includes(keyword) && keyword.length > 3
          )
        );
        if (relevantLines.length > 0) {
          sowSection = relevantLines.slice(0, 3).join('\n');
        }
      }

      // Build acceptance JSON with checklist and SOW
      const acceptanceData = {
        checklist: milestone.acceptance || [],
        sow: sowSection || milestone.description || ''
      };

      return {
        campaignId: id,
        name: milestone.title,
        pct,
        acceptance: acceptanceData
      };
    });

    // Create milestones in database
    const createdMilestones = await prisma.$transaction(
      milestonesToCreate.map(milestone => 
        prisma.milestone.create({
          data: milestone
        })
      )
    );

    return NextResponse.json({ 
      message: `Successfully created ${createdMilestones.length} milestones`,
      milestones: createdMilestones
    });

  } catch (error) {
    console.error('Error generating milestones:', error);
    return NextResponse.json({ 
      error: 'Failed to generate milestones' 
    }, { status: 500 });
  }
}
