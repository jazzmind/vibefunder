import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function OrganizationDashboard({ 
  searchParams 
}: { 
  searchParams: Promise<{ success?: string }> 
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

  // Calculate stats
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedDollars, 0);
  const totalPledges = campaigns.reduce((sum, c) => sum + c._count.pledges, 0);
  const liveCampaigns = campaigns.filter(c => c.status === 'live');
  const draftCampaigns = campaigns.filter(c => c.status === 'draft');

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
            <div className="text-sm text-gray-600 dark:text-gray-400">Services Offered</div>
            <div className="text-2xl font-bold text-blue-600">{userOrganization._count.services}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Team Members</div>
            <div className="text-2xl font-bold text-purple-600">{userOrganization._count.teamMembers}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Draft Campaigns */}
            {draftCampaigns.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Draft Campaigns ({draftCampaigns.length})
                  </h2>
                  {canManage && (
                    <Link href="/campaigns/create" className="btn-secondary text-sm">
                      New Campaign
                    </Link>
                  )}
                </div>
                <div className="space-y-4">
                  {draftCampaigns.slice(0, 3).map(campaign => (
                    <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{campaign.summary}</p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>Goal: ${campaign.fundingGoalDollars.toLocaleString()}</span>
                            <span>Milestones: {campaign._count.milestones}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link href={`/campaigns/${campaign.id}/edit`} className="btn-secondary text-sm px-3 py-1">
                            Edit
                          </Link>
                          <Link href={`/campaigns/${campaign.id}`} className="btn text-sm px-3 py-1">
                            Preview
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {draftCampaigns.length > 3 && (
                    <Link href={`/organizations/${userOrganization.id}/campaigns`} className="text-brand hover:text-brand-dark text-sm font-medium">
                      View all {draftCampaigns.length} draft campaigns →
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Live Campaigns */}
            {liveCampaigns.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Live Campaigns ({liveCampaigns.length})
                </h2>
                <div className="space-y-4">
                  {liveCampaigns.slice(0, 3).map(campaign => {
                    const fundingProgress = (campaign.raisedDollars / campaign.fundingGoalDollars) * 100;
                    return (
                      <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.title}</h3>
                            <div className="mt-3">
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
                              <div className="flex justify-between text-sm mt-2">
                                <span className="font-semibold text-gray-900 dark:text-white">${campaign.raisedDollars.toLocaleString()}</span>
                                <span className="text-gray-600 dark:text-gray-400">{campaign._count.pledges} backers</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Link href={`/campaigns/${campaign.id}/edit`} className="btn-secondary text-sm px-3 py-1">
                              Manage
                            </Link>
                            <Link href={`/campaigns/${campaign.id}`} className="btn text-sm px-3 py-1">
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {liveCampaigns.length > 3 && (
                    <Link href={`/organizations/${userOrganization.id}/campaigns`} className="text-brand hover:text-brand-dark text-sm font-medium">
                      View all {liveCampaigns.length} live campaigns →
                    </Link>
                  )}
                </div>
              </section>
            )}

            {/* Services */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Services ({userOrganization.services.length})
                </h2>
                {canManage && userOrganization.status === 'approved' && (
                  <Link href={`/organizations/${userOrganization.id}/services`} className="btn-secondary text-sm">
                    Manage Services
                  </Link>
                )}
              </div>
              {userOrganization.services.length > 0 ? (
                <div className="space-y-4">
                  {userOrganization.services.slice(0, 3).map(service => (
                    <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{service.category.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {service.title || service.category.name}
                            </h3>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {service.category.name}
                            </span>
                            {service.isFeatured && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <Link href={`/organizations/${userOrganization.id}/services`} className="btn-secondary text-sm px-3 py-1">
                            Manage
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                  {userOrganization.services.length > 3 && (
                    <Link href={`/organizations/${userOrganization.id}/services`} className="text-brand hover:text-brand-dark text-sm font-medium">
                      View all {userOrganization.services.length} services →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🛠️</span>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Services Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {userOrganization.status !== 'approved' 
                      ? 'Organization approval required to add services.'
                      : 'Add services to showcase your capabilities.'}
                  </p>
                  {canManage && userOrganization.status === 'approved' && (
                    <Link href={`/organizations/${userOrganization.id}/services`} className="btn">
                      Manage Services
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team</h3>
                {canManage && (
                  <Link href={`/organizations/${userOrganization.id}/team`} className="btn-secondary text-sm">
                    Manage
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                {/* Owner */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-brand text-sm font-semibold">
                      {(userOrganization.owner.name || userOrganization.owner.email)[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {userOrganization.owner.name || userOrganization.owner.email}
                    </h4>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      Owner
                    </p>
                  </div>
                </div>
                
                {/* Team Members */}
                {userOrganization.teamMembers.slice(0, 4).map(member => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                      {member.headshot ? (
                        <img 
                          src={member.headshot} 
                          alt={member.user.name || member.user.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {member.user.name || member.user.email}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {member.title || member.role}
                      </p>
                    </div>
                  </div>
                ))}
                {userOrganization.teamMembers.length > 4 && (
                  <Link href={`/organizations/${userOrganization.id}/team`} className="text-brand hover:text-brand-dark text-sm font-medium">
                    View all {userOrganization.teamMembers.length + 1} members →
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/campaigns/create" className="w-full btn text-center text-sm">
                  Create Campaign
                </Link>
                {userOrganization.status === 'approved' && (
                  <Link href={`/organizations/${userOrganization.id}/services`} className="w-full btn-secondary text-center text-sm">
                    Manage Services
                  </Link>
                )}
                {canManage && (
                  <Link href={`/organizations/${userOrganization.id}/team/invite`} className="w-full btn-secondary text-center text-sm">
                    Invite Team Member
                  </Link>
                )}
                <Link href={`/services/providers/${userOrganization.id}`} className="w-full btn-secondary text-center text-sm">
                  View Public Profile
                </Link>
              </div>
            </div>

            {/* Status & Application Info */}
            {userOrganization.status !== 'approved' && (
              <div className={`rounded-2xl p-6 border ${
                userOrganization.status === 'pending' 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  userOrganization.status === 'pending' 
                    ? 'text-yellow-900 dark:text-yellow-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {userOrganization.status === 'pending' ? 'Application Under Review' : 'Application Rejected'}
                </h3>
                <p className={`text-sm mb-4 ${
                  userOrganization.status === 'pending'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {userOrganization.status === 'pending' 
                    ? 'Your organization application is being reviewed. You can create campaigns but cannot offer services until approved.'
                    : 'Your organization application was rejected. Contact support for more information.'}
                </p>
                {userOrganization.notes && (
                  <div className="text-sm">
                    <strong>Admin Notes:</strong> {userOrganization.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
