import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ConfirmButton } from "@/app/components/ConfirmButton";

export default async function AdminCampaigns({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string }> 
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session || !session.roles.includes('admin')) {
    redirect('/signin');
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      maker: true,
      pledges: { select: { id: true, amountDollars: true } },
      _count: {
        select: {
          pledges: true,
          comments: true,
          milestones: true
        }
      }
    }
  });

  async function updateCampaignStatus(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session || !session.roles.includes('admin')) {
      redirect('/signin');
    }

    const campaignId = formData.get("campaignId") as string;
    const status = formData.get("status") as string;

    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status }
      });
      redirect('/admin/campaigns?success=status-updated');
    } catch (error) {
      console.error('Error updating campaign status:', error);
      redirect('/admin/campaigns?error=status-update-failed');
    }
  }

  async function deleteCampaign(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session || !session.roles.includes('admin')) {
      redirect('/signin');
    }

    const campaignId = formData.get("campaignId") as string;

    try {
      await prisma.campaign.delete({
        where: { id: campaignId }
      });
      redirect('/admin/campaigns?success=campaign-deleted');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      redirect('/admin/campaigns?error=delete-failed');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Campaign Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage all platform campaigns and their status</p>
          </div>
          <Link href="/admin" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        {/* Error/Success Messages */}
        {params.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">
              {params.error === 'delete-failed' && 'Failed to delete campaign. Please try again.'}
              {params.error === 'status-update-failed' && 'Failed to update campaign status. Please try again.'}
              {!['delete-failed', 'status-update-failed'].includes(params.error) && 'An error occurred.'}
            </p>
          </div>
        )}
        
        {params.success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300">
              {params.success === 'campaign-deleted' && 'Campaign deleted successfully.'}
              {params.success === 'status-updated' && 'Campaign status updated successfully.'}
            </p>
          </div>
        )}

        {/* Campaign Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{campaigns.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Draft</div>
            <div className="text-2xl font-bold text-yellow-600">{campaigns.filter(c => c.status === 'draft').length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Live</div>
            <div className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === 'live').length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            <div className="text-2xl font-bold text-blue-600">{campaigns.filter(c => c.status === 'completed').length}</div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Campaigns ({campaigns.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Maker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Funding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns.map((campaign) => {
                  const fundingProgress = campaign.fundingGoalDollars > 0 ? (campaign.raisedDollars / campaign.fundingGoalDollars) * 100 : 0;
                  
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <Link 
                            href={`/campaigns/${campaign.id}`}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand truncate block"
                          >
                            {campaign.title}
                          </Link>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {campaign.summary}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {campaign.maker.name || campaign.maker.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {campaign.maker.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-900 dark:text-white font-semibold">
                          ${campaign.raisedDollars.toLocaleString()} / ${campaign.fundingGoalDollars.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {Math.round(fundingProgress)}% funded
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="space-y-1">
                          <div>{campaign._count.pledges} pledges</div>
                          <div>{campaign._count.comments} comments</div>
                          <div>{campaign._count.milestones} milestones</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link 
                            href={`/campaigns/${campaign.id}`}
                            className="text-brand hover:text-brand-dark"
                          >
                            View
                          </Link>
                          
                          <Link 
                            href={`/campaigns/${campaign.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </Link>
                          
                          <details className="relative">
                            <summary className="cursor-pointer text-brand hover:text-brand-dark">
                              Status
                            </summary>
                            <div className="absolute top-6 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 w-32">
                              <form action={updateCampaignStatus}>
                                <input type="hidden" name="campaignId" value={campaign.id} />
                                <div className="space-y-2">
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="status" 
                                      value="draft" 
                                      defaultChecked={campaign.status === 'draft'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Draft</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="status" 
                                      value="live" 
                                      defaultChecked={campaign.status === 'live'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Live</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="status" 
                                      value="completed" 
                                      defaultChecked={campaign.status === 'completed'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Completed</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="status" 
                                      value="cancelled" 
                                      defaultChecked={campaign.status === 'cancelled'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Cancelled</span>
                                  </label>
                                </div>
                                <button 
                                  type="submit" 
                                  className="w-full mt-3 btn text-xs py-1"
                                >
                                  Update
                                </button>
                              </form>
                            </div>
                          </details>
                          
                          <form action={deleteCampaign} className="inline">
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <ConfirmButton
                              confirmMessage={`Are you sure you want to delete "${campaign.title}"? This action cannot be undone.`}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {campaigns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No campaigns found</p>
          </div>
        )}
      </div>
    </div>
  );
}