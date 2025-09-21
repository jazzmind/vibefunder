import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export default async function Dashboard({ 
  searchParams 
}: { 
  searchParams: Promise<{ success?: string }> 
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
    return; // Ensure we don't continue execution
  }

  // Check if user has an organization - if so, redirect to organization dashboard
  const userOrganization = await prisma.organization.findFirst({
    where: { 
      OR: [
        { ownerId: session.userId },
        { 
          teamMembers: {
            some: { userId: session.userId }
          }
        }
      ]
    }
  });

  if (userOrganization) {
    redirect('/organizations/dashboard');
  }

  // Fetch user's campaigns (legacy support for users without organizations)
  const campaigns = await prisma.campaign.findMany({
    where: { makerId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          pledges: true,
          comments: true,
          milestones: true
        }
      }
    }
  });

  // If user has no campaigns, redirect to create first campaign
  if (campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to VibeFunder!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Ready to launch your first campaign? Connect with charter customers and validate your ideas.
          </p>
          <div className="space-y-4">
            <Link 
              href="/organizations/new" 
              className="btn inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Create Organization
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              or 
              <Link href="/campaigns/create" className="text-brand hover:text-brand-dark font-medium ml-1">
                create a personal campaign
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const draftCampaigns = campaigns.filter(c => c.status === 'draft');
  const liveCampaigns = campaigns.filter(c => c.status === 'live');
  const completedCampaigns = campaigns.filter(c => ['funded', 'completed'].includes(c.status));

  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedDollars, 0);
  const totalPledges = campaigns.reduce((sum, c) => sum + c._count.pledges, 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Campaign Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage your campaigns, track progress, and engage with your community.</p>
          </div>
          <Link href="/campaigns/create" className="btn">
            Create New Campaign
          </Link>
        </div>

        {/* Success Message */}
        {params.success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300">
              {params.success === 'campaign-deleted' && 'Campaign deleted successfully.'}
            </p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{campaigns.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Raised</div>
            <div className="text-2xl font-bold text-green-600">${totalRaised.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Backers</div>
            <div className="text-2xl font-bold text-blue-600">{totalPledges}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Live Campaigns</div>
            <div className="text-2xl font-bold text-orange-600">{liveCampaigns.length}</div>
          </div>
        </div>

        {/* Draft Campaigns */}
        {draftCampaigns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Draft Campaigns ({draftCampaigns.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {draftCampaigns.map(campaign => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                      Draft
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{campaign.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{campaign.summary}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Goal:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">${campaign.fundingGoalDollars.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Milestones:</span>
                      <span className="text-gray-900 dark:text-white">{campaign._count.milestones}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/campaigns/${campaign.id}/edit`} className="flex-1 btn-secondary text-center text-sm py-2">
                      Edit
                    </Link>
                    <Link href={`/campaigns/${campaign.id}`} className="flex-1 btn text-center text-sm py-2">
                      Preview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Campaigns */}
        {liveCampaigns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Live Campaigns ({liveCampaigns.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveCampaigns.map(campaign => {
                const fundingProgress = (campaign.raisedDollars / campaign.fundingGoalDollars) * 100;
                
                return (
                  <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <span className="px-3 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        Live
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {campaign._count.pledges} backers
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{campaign.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{campaign.summary}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Progress</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{Math.round(fundingProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-brand h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">${campaign.raisedDollars.toLocaleString()}</span>
                        <span className="text-gray-600 dark:text-gray-400">of ${campaign.fundingGoalDollars.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Comments:</span>
                        <span className="text-gray-900 dark:text-white">{campaign._count.comments}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/campaigns/${campaign.id}/edit`} className="flex-1 btn-secondary text-center text-sm py-2">
                        Manage
                      </Link>
                      <Link href={`/campaigns/${campaign.id}`} className="flex-1 btn text-center text-sm py-2">
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Campaigns */}
        {completedCampaigns.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Completed Campaigns ({completedCampaigns.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCampaigns.map(campaign => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                      {campaign.status === 'funded' ? 'Funded' : 'Completed'}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {campaign._count.pledges} backers
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{campaign.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{campaign.summary}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Raised:</span>
                      <span className="font-semibold text-green-600">${campaign.raisedDollars.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Comments:</span>
                      <span className="text-gray-900 dark:text-white">{campaign._count.comments}</span>
                    </div>
                  </div>
                  
                  <Link href={`/campaigns/${campaign.id}`} className="w-full btn text-center text-sm py-2">
                    View Campaign
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}