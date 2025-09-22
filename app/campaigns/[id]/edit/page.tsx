import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

import CampaignEditForm from "./CampaignEditForm";
import { Campaign, CampaignAnalysis } from "@prisma/client";
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaign({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await auth();
  
  if (!session?.user) {
    redirect('/signin');
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      maker: true,
      organization: true,
      milestones: true,
      stretchGoals: { orderBy: { order: 'asc' } },
      pledgeTiers: { orderBy: { order: 'asc' } },
      analysis: true,
    }
    }) as Campaign;

    if (!campaign) {
    redirect('/campaigns');
  }

  const isOwner = campaign.makerId === session.user.id;
  const isAdmin = session.user.roles?.includes('admin');
  const canEdit = isOwner || isAdmin;

  if (!canEdit) {
    redirect(`/campaigns/${campaign.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
   

          <CampaignEditForm campaign={campaign} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}