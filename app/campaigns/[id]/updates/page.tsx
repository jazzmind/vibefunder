import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import CampaignUpdatesClient from "./CampaignUpdatesClient";

export default async function CampaignUpdates({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  const campaign = await prisma.campaign.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      maker: true,
      teamMembers: { include: { user: true } },
      updates: { 
          include: { 
            author: true,
            _count: { select: { comments: true } }
          },
        orderBy: { createdAt: 'desc' }
      },
      pledges: { select: { backer: { select: { email: true } } } }
    }
  });

  if (!campaign) {
    return notFound();
  }

  // Check user permissions
  const isOwner = session && campaign.makerId === session.userId;
  const isTeamMember = session && campaign.teamMembers.some((tm: any) => tm.userId === session.userId);
  const canCreateUpdate = isOwner || isTeamMember;


  return (
    <CampaignUpdatesClient 
      campaign={{
        ...campaign,
        updates: campaign.updates.map(update => ({
          ...update,
          createdAt: update.createdAt.toISOString()
        }))
      }}
      canCreateUpdate={canCreateUpdate || false}
      isOwner={isOwner || false}
      isTeamMember={isTeamMember || false}
      userId={session?.userId}
      teamMemberIds={campaign.teamMembers?.map((tm: any) => tm.userId) || []}
    />
  );
}