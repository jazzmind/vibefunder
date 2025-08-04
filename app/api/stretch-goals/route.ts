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

  const { campaignId, title, description, targetDollars, order } = await req.json();

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
    const stretchGoal = await prisma.stretchGoal.create({
      data: {
        campaignId,
        title,
        description,
        targetDollars: Math.round(targetDollars),
        order: order || 1
      }
    });

    return NextResponse.json(stretchGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating stretch goal:', error);
    return NextResponse.json({ error: "Failed to create stretch goal" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description, targetDollars, order } = await req.json();

  // Find the stretch goal and verify permissions
  const stretchGoal = await prisma.stretchGoal.findUnique({
    where: { id },
    include: {
      campaign: {
        include: { teamMembers: true }
      }
    }
  });

  if (!stretchGoal) {
    return NextResponse.json({ error: "Stretch goal not found" }, { status: 404 });
  }

  const isOwner = stretchGoal.campaign.makerId === session.userId;
  const isTeamMember = stretchGoal.campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;

  if (!isOwner && !isTeamMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updatedStretchGoal = await prisma.stretchGoal.update({
      where: { id },
      data: {
        title,
        description,
        targetDollars: Math.round(targetDollars),
        order
      }
    });

    return NextResponse.json(updatedStretchGoal);
  } catch (error) {
    console.error('Error updating stretch goal:', error);
    return NextResponse.json({ error: "Failed to update stretch goal" }, { status: 500 });
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
    return NextResponse.json({ error: "Stretch goal ID required" }, { status: 400 });
  }

  // Find the stretch goal and verify permissions
  const stretchGoal = await prisma.stretchGoal.findUnique({
    where: { id },
    include: {
      campaign: {
        include: { teamMembers: true }
      }
    }
  });

  if (!stretchGoal) {
    return NextResponse.json({ error: "Stretch goal not found" }, { status: 404 });
  }

  const isOwner = stretchGoal.campaign.makerId === session.userId;
  const isTeamMember = stretchGoal.campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;

  if (!isOwner && !isTeamMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.stretchGoal.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stretch goal:', error);
    return NextResponse.json({ error: "Failed to delete stretch goal" }, { status: 500 });
  }
}