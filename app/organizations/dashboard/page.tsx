import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardTabs from "@/components/organization/DashboardTabs";
import { getServiceProviderMetrics } from "@/lib/services/ServiceProviderMetrics";

export default async function OrganizationDashboard({ 
  searchParams 
}: { 
  searchParams: Promise<{ success?: string; tab?: string }> 
}) {
  const params = await searchParams;
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/signin');
  }

  // Get user's organization (owned or member of)
  const userOrganization = await prisma.organization.findFirst({
    where: { 
      OR: [
        { ownerId: session.user.id },
        { 
          teamMembers: {
            some: { userId: session.user.id }
          }
        }
      ]
    },
    include: {
      owner: true,
      campaigns: {
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
      },
      services: {
        where: { isActive: true },
        include: { category: true },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' }
        ]
      },
      teamMembers: {
        include: { user: true },
        orderBy: { order: 'asc' }
      },
      _count: {
        select: {
          campaigns: true,
          services: true,
          teamMembers: true
        }
      }
    }
  });

  // If no organization, redirect to create one
  if (!userOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Welcome to VibeFunder!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Ready to start your organization? Create campaigns, offer services, and build your team.
          </p>
          <Link 
            href="/organizations/new" 
            className="btn inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your Organization
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = userOrganization.ownerId === session.user.id;
  const userMembership = userOrganization.teamMembers.find(m => m.userId === session.user.id);
  const canManage = isOwner || userMembership?.role === 'admin';
  
  // Service provider analytics (real data)
  const isServiceProvider = userOrganization.type === 'service_provider';
  const serviceProviderMetrics = isServiceProvider 
    ? await getServiceProviderMetrics(userOrganization.id)
    : null;

  // Get all campaigns by organization members (owner + team members)
  const allTeamUserIds = [
    userOrganization.ownerId,
    ...userOrganization.teamMembers.map(m => m.userId)
  ];

  const allCampaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { organizationId: userOrganization.id },
        { makerId: { in: allTeamUserIds } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          pledges: true,
          comments: true,
          milestones: true
        }
      },
      maker: true
    }
  });

  // Use allCampaigns instead of userOrganization.campaigns
  const campaigns = allCampaigns;

  // Get backed campaigns (campaigns user has pledged to)
  const backedCampaigns = await prisma.campaign.findMany({
    where: {
      pledges: {
        some: {
          backerId: session.user.id
        }
      }
    },
    include: {
      _count: {
        select: {
          pledges: true,
          comments: true,
          milestones: true
        }
      },
      maker: true,
      pledges: {
        where: { backerId: session.user.id },
        select: { amountDollars: true, createdAt: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate stats
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedDollars, 0);
  const totalPledges = campaigns.reduce((sum, c) => sum + c._count.pledges, 0);
  const liveCampaigns = campaigns.filter(c => c.status === 'live');
  const draftCampaigns = campaigns.filter(c => c.status === 'draft');
  const totalBacked = backedCampaigns.reduce((sum, c) => sum + (c.pledges[0]?.amountDollars || 0), 0);
  
  // Determine default tab based on content
  const hasCampaigns = campaigns.length > 0;
  const hasServices = userOrganization.services.length > 0;
  const hasBackedCampaigns = backedCampaigns.length > 0;
  
  // If user is only a backer (no organization campaigns/services), default to backed campaigns
  const isOnlyBacker = !hasCampaigns && !hasServices && hasBackedCampaigns;
  
  const defaultTab = isOnlyBacker 
    ? 'backed'
    : isServiceProvider 
    ? (hasServices ? 'services' : 'services') // Service providers default to services
    : (hasCampaigns ? 'campaigns' : 'campaigns'); // Creators default to campaigns
    
  const activeTab = params.tab || defaultTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              {userOrganization.logo ? (
                <img 
                  src={userOrganization.logo} 
                  alt={userOrganization.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-brand/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{userOrganization.name}</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {userOrganization.shortDescription || userOrganization.description}
                </p>
                {isServiceProvider && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Service Provider Dashboard
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userOrganization.status === 'approved' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : userOrganization.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {userOrganization.status.charAt(0).toUpperCase() + userOrganization.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {userOrganization.type === 'service_provider' ? 'Service Provider' : 'Creator Organization'}
                  </span>
                </div>
              </div>
            </div>
            
            {canManage && (
              <div className="flex space-x-3">
                <Link href={`/organizations/${userOrganization.id}/settings`} className="btn-secondary">
                  Organization Settings
                </Link>
                <Link href="/campaigns/create" className="btn">
                  Create Campaign
                </Link>
              </div>
            )}
          </div>

          {/* Success Messages */}
          {params.success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                {params.success === 'organization-updated' && 'Organization updated successfully.'}
                {params.success === 'service-added' && 'Service added successfully.'}
                {params.success === 'team-member-added' && 'Team member added successfully.'}
              </p>
            </div>
          )}
        </div>

        {/* Tabbed Dashboard */}
        <DashboardTabs
          defaultTab={defaultTab}
          hasCampaigns={hasCampaigns}
          hasServices={hasServices}
          hasBackedCampaigns={hasBackedCampaigns}
          isServiceProvider={isServiceProvider}
          isOnlyBacker={isOnlyBacker}
          campaigns={campaigns}
          backedCampaigns={backedCampaigns}
          services={userOrganization.services}
          organization={userOrganization}
          canManage={canManage}
          serviceProviderAnalytics={serviceProviderMetrics}
          totalRaised={totalRaised}
          totalBacked={totalBacked}
          liveCampaigns={liveCampaigns}
          draftCampaigns={draftCampaigns}
        />
      </div>
    </div>
  );
}