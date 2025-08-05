import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfirmButton } from "@/app/components/ConfirmButton";

interface AdminCampaignDetailProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AdminCampaignDetail({ 
  params, 
  searchParams 
}: AdminCampaignDetailProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      maker: true,
      organization: true,
      pledges: {
        include: { backer: true },
        orderBy: { createdAt: 'desc' }
      },
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      milestones: {
        orderBy: { createdAt: 'asc' }
      },
      pledgeTiers: {
        orderBy: { order: 'asc' }
      },
      stretchGoals: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: {
          pledges: true,
          comments: true,
          milestones: true
        }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  const fundingProgress = campaign.fundingGoalDollars > 0 
    ? (campaign.raisedDollars / campaign.fundingGoalDollars) * 100 
    : 0;

  async function updateCampaignStatus(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const campaignId = formData.get("campaignId") as string;
    const status = formData.get("status") as string;

    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status }
      });
      
      redirect(`/admin/campaigns/${campaignId}?success=Campaign status updated successfully`);
    } catch (error) {
      console.error('Error updating campaign status:', error);
      redirect(`/admin/campaigns/${campaignId}?error=Failed to update campaign status`);
    }
  }

  async function deleteCampaign(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const campaignId = formData.get("campaignId") as string;

    try {
      await prisma.campaign.delete({
        where: { id: campaignId }
      });
      
      redirect('/admin/campaigns?success=Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      redirect(`/admin/campaigns/${campaignId}?error=Failed to delete campaign`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link 
            href="/admin/campaigns" 
            className="text-brand hover:text-brand-dark mb-4 inline-flex items-center text-sm"
          >
            ← Back to Campaigns
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {campaign.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Campaign Details & Management
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link 
            href={`/campaigns/${campaign.id}`}
            className="btn-secondary"
          >
            View Public Page
          </Link>
          <Link 
            href={`/campaigns/${campaign.id}/edit`}
            className="btn"
          >
            Edit Campaign
          </Link>
        </div>
      </div>

      {urlParams.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{urlParams.error}</p>
        </div>
      )}

      {urlParams.success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{urlParams.success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Campaign Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Campaign Overview
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h3>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  campaign.status === 'draft' 
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : campaign.status === 'live'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : campaign.status === 'completed'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {campaign.status}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Created</h3>
                <p className="text-gray-900 dark:text-white">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Funding Goal</h3>
                <p className="text-gray-900 dark:text-white text-lg font-semibold">
                  ${campaign.fundingGoalDollars.toLocaleString()}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Raised</h3>
                <p className="text-gray-900 dark:text-white text-lg font-semibold">
                  ${campaign.raisedDollars.toLocaleString()} ({Math.round(fundingProgress)}%)
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-brand h-2 rounded-full" 
                    style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Summary</h3>
              <p className="text-gray-900 dark:text-white">{campaign.summary}</p>
            </div>
            
            {campaign.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {campaign.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Creator Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Creator Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Creator</h3>
                <p className="text-gray-900 dark:text-white font-medium">
                  {campaign.maker.name || campaign.maker.email}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {campaign.maker.email}
                </p>
              </div>
              
              {campaign.organization && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Organization</h3>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {campaign.organization.name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {campaign.organization.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Campaign Statistics
            </h2>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand">{campaign._count.pledges}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Pledges</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand">{campaign._count.comments}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-brand">{campaign._count.milestones}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Milestones</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Campaign Status
            </h3>
            
            <form action={updateCampaignStatus} className="space-y-3">
              <input type="hidden" name="campaignId" value={campaign.id} />
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="draft" 
                  defaultChecked={campaign.status === 'draft'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Draft</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="live" 
                  defaultChecked={campaign.status === 'live'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Live</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="completed" 
                  defaultChecked={campaign.status === 'completed'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Completed</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="cancelled" 
                  defaultChecked={campaign.status === 'cancelled'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Cancelled</span>
              </label>
              
              <button 
                type="submit" 
                className="w-full btn mt-4"
              >
                Update Status
              </button>
            </form>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <Link 
                href={`/campaigns/${campaign.id}`}
                className="w-full btn-secondary text-center block"
              >
                View Public Page
              </Link>
              
              <Link 
                href={`/campaigns/${campaign.id}/edit`}
                className="w-full btn text-center block"
              >
                Edit Campaign
              </Link>
              
              <Link 
                href={`/campaigns/${campaign.id}/milestones`}
                className="w-full btn-secondary text-center block"
              >
                Manage Milestones
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
              Danger Zone
            </h3>
            
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              Deleting this campaign will permanently remove all associated data including pledges, comments, and milestones. This action cannot be undone.
            </p>
            
            <form action={deleteCampaign}>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <ConfirmButton
                confirmMessage={`Are you sure you want to delete "${campaign.title}"? This action cannot be undone and will remove all associated data.`}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete Campaign
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}