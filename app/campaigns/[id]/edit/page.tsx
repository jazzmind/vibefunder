import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CampaignEditForm from "./CampaignEditForm";

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
    }
  });

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Campaign
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Update your campaign details and content
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  campaign.status === 'draft' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : campaign.status === 'live' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          
          <CampaignEditForm campaign={campaign} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}