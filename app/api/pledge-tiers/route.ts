import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, title, description, amountDollars, benefits, order } = await req.json();

  // Verify user has permission to manage this campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { teamMembers: true }
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const isOwner = campaign.makerId === session.userId;
  const isTeamMember = campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;

  if (!isOwner && !isTeamMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pledgeTier = await prisma.pledgeTier.create({
      data: {
        campaignId,
        title,
        description: description || null,
        amountDollars: Math.round(amountDollars),
        benefits: benefits || [],
        order: order || 1
      }
    });

    return NextResponse.json(pledgeTier, { status: 201 });
  } catch (error) {
    console.error('Error creating pledge tier:', error);
    return NextResponse.json({ error: "Failed to create pledge tier" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description, amountDollars, benefits, order, isActive } = await req.json();

  // Find the pledge tier and verify permissions
  const pledgeTier = await prisma.pledgeTier.findUnique({
    where: { id },
    include: {
      campaign: {
        include: { teamMembers: true }
      }
    }
  });

  if (!pledgeTier) {
    return NextResponse.json({ error: "Pledge tier not found" }, { status: 404 });
  }

  const isOwner = pledgeTier.campaign.makerId === session.userId;
  const isTeamMember = pledgeTier.campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;

  if (!isOwner && !isTeamMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updatedPledgeTier = await prisma.pledgeTier.update({
      where: { id },
      data: {
        title,
        description: description || null,
        amountDollars: Math.round(amountDollars),
        benefits: benefits || [],
        order,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(updatedPledgeTier);
  } catch (error) {
    console.error('Error updating pledge tier:', error);
    return NextResponse.json({ error: "Failed to update pledge tier" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: "Pledge tier ID required" }, { status: 400 });
  }

  // Find the pledge tier and verify permissions
  const pledgeTier = await prisma.pledgeTier.findUnique({
    where: { id },
    include: {
      campaign: {
        include: { teamMembers: true }
      }
    }
  });

  if (!pledgeTier) {
    return NextResponse.json({ error: "Pledge tier not found" }, { status: 404 });
  }

  const isOwner = pledgeTier.campaign.makerId === session.userId;
  const isTeamMember = pledgeTier.campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;

  if (!isOwner && !isTeamMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.pledgeTier.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pledge tier:', error);
    return NextResponse.json({ error: "Failed to delete pledge tier" }, { status: 500 });
  }
}