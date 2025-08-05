import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const milestoneSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(200),
  pct: z.number().min(1).max(100),
  dueDate: z.string().optional(),
  acceptance: z.object({
    criteria: z.string(),
    deliverables: z.array(z.string()).optional()
  })
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = milestoneSchema.parse(body);

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: validatedData.campaignId },
      include: { organization: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const isOwner = campaign.makerId === session.user.id;
    const isOrgOwner = campaign.organization?.ownerId === session.user.id;
    
    if (!isOwner && !isOrgOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not own this campaign' }, { status: 403 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
      }
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
