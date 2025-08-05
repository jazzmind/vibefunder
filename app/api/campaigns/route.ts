import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const campaignSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  description: z.string().optional(),
  fundingGoalDollars: z.number().min(1).max(10000000),
  budgetDollars: z.number().min(1).max(10000000),
  organizationId: z.string().optional()
});

export async function GET() {
  console.log('[API] /api/campaigns GET request received');
  try {
    const items = await prisma.campaign.findMany({
      where: { status: 'published' }, // Only show published campaigns
      orderBy: { createdAt: "desc" },
      include: {
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('[API] /api/campaigns POST request received');
  try {
    const session = await auth();
    console.log('[API] Session:', session);
    if (!session?.user?.id) {
      console.log('[API] No session or user ID, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = campaignSchema.parse(body);

    // Verify organization ownership if provided
    if (validatedData.organizationId) {
      const org = await prisma.organization.findFirst({
        where: {
          id: validatedData.organizationId,
          ownerId: session.user.id
        }
      });
      if (!org) {
        return NextResponse.json({ error: 'Organization not found or not owned by user' }, { status: 403 });
      }
    }

    const item = await prisma.campaign.create({
      data: {
        ...validatedData,
        makerId: session.user.id,
        status: 'draft'
      },
      include: {
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
