import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session || !session.roles.includes('admin')) {
    redirect('/signin');
  }

  // Get overview statistics
  const [
    totalUsers,
    totalCampaigns,
    activeCampaigns,
    totalRaised,
    draftCampaigns,
    liveCampaigns,
    completedCampaigns,
    totalPledges
  ] = await Promise.all([
    prisma.user.count(),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: 'live' } }),
    prisma.campaign.aggregate({ _sum: { raisedDollars: true } }),
    prisma.campaign.count({ where: { status: 'draft' } }),
    prisma.campaign.count({ where: { status: 'live' } }),
    prisma.campaign.count({ where: { status: 'completed' } }),
    prisma.pledge.count()
  ]);

  // Get recent activity
  const recentCampaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { maker: true }
  });

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage users, campaigns, and platform analytics</p>
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Link 
            href="/admin/users" 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Manage Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/admin/campaigns" 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">All Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCampaigns}</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/admin/organizations" 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Organizations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/admin/analytics" 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Raised</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRaised._sum.raisedDollars?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Statistics Overview */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Draft Campaigns</span>
                <span className="font-semibold text-gray-900 dark:text-white">{draftCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Live Campaigns</span>
                <span className="font-semibold text-green-600">{liveCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Completed Campaigns</span>
                <span className="font-semibold text-blue-600">{completedCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Pledges</span>
                <span className="font-semibold text-purple-600">{totalPledges}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active Campaigns</span>
                <span className="font-semibold text-gray-900 dark:text-white">{activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="font-semibold text-green-600">
                  {totalCampaigns > 0 ? Math.round((completedCampaigns / totalCampaigns) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avg. Campaign Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${totalCampaigns > 0 ? Math.round((totalRaised._sum.raisedDollars || 0) / totalCampaigns).toLocaleString() : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Campaigns</h3>
              <Link href="/admin/campaigns" className="text-sm text-brand hover:text-brand-dark font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/campaigns/${campaign.id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand truncate block"
                    >
                      {campaign.title}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      by {campaign.maker.name || campaign.maker.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/campaigns/${campaign.id}/edit`}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Edit
                    </Link>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      campaign.status === 'draft' 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : campaign.status === 'live'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Users</h3>
              <Link href="/admin/users" className="text-sm text-brand hover:text-brand-dark font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {user.roles.map((role) => (
                      <span key={role} className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}