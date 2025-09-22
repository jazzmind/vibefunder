import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminCampaigns({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string }> 
}) {
  const params = await searchParams;
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: [
      { reviewStatus: 'asc' }, // pending_review first
      { submittedForReviewAt: 'desc' }, // newest submissions first within review status
      { createdAt: 'desc' }
    ],
    include: {
      maker: true,
      organization: true,
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

  // Group campaigns by review status for better organization
  const pendingReviewCampaigns = campaigns.filter(c => c.reviewStatus === 'pending_review');
  const needsChangesCampaigns = campaigns.filter(c => c.reviewStatus === 'needs_changes');
  const otherCampaigns = campaigns.filter(c => !['pending_review', 'needs_changes'].includes(c.reviewStatus || ''));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Management</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Click on any campaign to view details and manage status, edit, or delete.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            {pendingReviewCampaigns.length > 0 && (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                {pendingReviewCampaigns.length} pending review{pendingReviewCampaigns.length !== 1 ? 's' : ''}
              </div>
            )}
            {needsChangesCampaigns.length > 0 && (
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full">
                {needsChangesCampaigns.length} need{needsChangesCampaigns.length === 1 ? 's' : ''} changes
              </div>
            )}
          </div>
        </div>
      </div>

      {params.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{params.error}</p>
        </div>
      )}

      {params.success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{params.success}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Creator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Review Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Funding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {campaigns.map((campaign) => {
                const fundingProgress = campaign.fundingGoalDollars > 0 
                  ? (campaign.raisedDollars / campaign.fundingGoalDollars) * 100 
                  : 0;

                return (
                  <tr 
                    key={campaign.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {campaign.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {campaign.summary}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {campaign.maker.name || campaign.maker.email}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {campaign.maker.email}
                          </div>
                          {campaign.organization && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {campaign.organization.name}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
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
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        {campaign.reviewStatus === 'pending_review' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            📋 Pending Review
                          </span>
                        ) : campaign.reviewStatus === 'approved' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            ✅ Approved
                          </span>
                        ) : campaign.reviewStatus === 'needs_changes' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            ⚠ Needs Changes
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            Not Submitted
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        <div className="text-gray-900 dark:text-white font-semibold">
                          ${campaign.raisedDollars.toLocaleString()} / ${campaign.fundingGoalDollars.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {Math.round(fundingProgress)}% funded
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className="bg-brand h-2 rounded-full" 
                            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                          ></div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        <div className="space-y-1">
                          <div>{campaign._count.pledges} pledges</div>
                          <div>{campaign._count.comments} comments</div>
                          <div>{campaign._count.milestones} milestones</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <Link href={`/admin/campaigns/${campaign.id}`} className="block">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </Link>
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
  );
}