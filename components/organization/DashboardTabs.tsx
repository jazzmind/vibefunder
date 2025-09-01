'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface DashboardTabsProps {
  defaultTab: string;
  hasCampaigns: boolean;
  hasServices: boolean;
  isServiceProvider: boolean;
  campaigns: any[];
  services: any[];
  organization: any;
  canManage: boolean;
  serviceProviderAnalytics?: any;
  totalRaised: number;
  liveCampaigns: any[];
  draftCampaigns: any[];
}

export default function DashboardTabs({
  defaultTab,
  hasCampaigns,
  hasServices,
  isServiceProvider,
  campaigns,
  services,
  organization,
  canManage,
  serviceProviderAnalytics,
  totalRaised,
  liveCampaigns,
  draftCampaigns
}: DashboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || defaultTab);

  useEffect(() => {
    const tab = searchParams.get('tab') || defaultTab;
    setActiveTab(tab);
  }, [searchParams, defaultTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  const tabs = [
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: '🚀',
      count: campaigns.length
    },
    {
      id: 'services',
      label: 'Services',
      icon: '🛠️',
      count: services.length
    }
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === tab.id
                  ? 'bg-brand/10 text-brand'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'campaigns' && (
            <CampaignsTabContent
              campaigns={campaigns}
              hasCampaigns={hasCampaigns}
              hasServices={hasServices}
              isServiceProvider={isServiceProvider}
              organization={organization}
              canManage={canManage}
              totalRaised={totalRaised}
              liveCampaigns={liveCampaigns}
              draftCampaigns={draftCampaigns}
            />
          )}

          {activeTab === 'services' && (
            <ServicesTabContent
              services={services}
              hasServices={hasServices}
              hasCampaigns={hasCampaigns}
              isServiceProvider={isServiceProvider}
              organization={organization}
              canManage={canManage}
              serviceProviderAnalytics={serviceProviderAnalytics}
            />
          )}
        </div>

        {/* Sidebar - Dynamic based on active tab */}
        <div className="space-y-6">
          {activeTab === 'campaigns' ? (
            <CampaignsSidebar 
              organization={organization}
              canManage={canManage}
              totalRaised={totalRaised}
              campaigns={campaigns}
            />
          ) : (
            <ServicesSidebar 
              organization={organization}
              canManage={canManage}
              isServiceProvider={isServiceProvider}
              serviceProviderAnalytics={serviceProviderAnalytics}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignsTabContent({ 
  campaigns, 
  hasCampaigns, 
  hasServices,
  isServiceProvider,
  organization, 
  canManage,
  totalRaised,
  liveCampaigns,
  draftCampaigns
}: any) {
  if (!hasCampaigns) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <span className="text-6xl mb-6 block">🚀</span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Start Your First Campaign
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
          {isServiceProvider 
            ? "While you're primarily a service provider, you can also create campaigns to raise funds for your own projects or product development."
            : "Launch a crowdfunding campaign to validate your product idea and secure funding from early customers who believe in your vision."
          }
        </p>
        {hasServices && isServiceProvider && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Great news! You already have services listed. Consider creating a campaign to fund expansion of your service offerings or develop new solutions.
            </p>
          </div>
        )}
        <div className="space-y-3">
          <Link href="/campaigns/create" className="btn inline-flex items-center gap-2">
            <span>🚀</span>
            Create Your First Campaign
          </Link>
          {!hasServices && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Or <Link href="?tab=services" className="text-brand hover:text-brand-dark">explore offering services</Link> in our marketplace
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Campaign Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{campaigns.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Raised</div>
          <div className="text-2xl font-bold text-green-600">${totalRaised.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Live Campaigns</div>
          <div className="text-2xl font-bold text-blue-600">{liveCampaigns.length}</div>
        </div>
      </div>

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
            {draftCampaigns.slice(0, 3).map((campaign: any) => (
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
            {liveCampaigns.slice(0, 3).map((campaign: any) => {
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
          </div>
        </section>
      )}
    </>
  );
}

function ServicesTabContent({ 
  services, 
  hasServices, 
  hasCampaigns,
  isServiceProvider,
  organization, 
  canManage,
  serviceProviderAnalytics
}: any) {
  if (!hasServices) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <span className="text-6xl mb-6 block">🛠️</span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Do You Offer Any Services?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
          {isServiceProvider
            ? "Complete your service provider profile by listing the professional services you offer. This helps clients find and hire you for their projects."
            : "Even if you're primarily focused on campaigns, you might offer consulting, development, or other services. List them in our marketplace to generate additional revenue."
          }
        </p>
        {hasCampaigns && !isServiceProvider && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              💡 Great! You have campaigns running. Consider offering related services like consulting or custom development to maximize your expertise.
            </p>
          </div>
        )}
        <div className="space-y-3">
          {organization.status === 'approved' ? (
            <Link href={`/organizations/${organization.id}/settings?tab=services`} className="btn inline-flex items-center gap-2">
              <span>🛠️</span>
              List Your Services
            </Link>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Organization approval required to list services. Your application is being reviewed.
              </p>
            </div>
          )}
          {!hasCampaigns && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Or <Link href="?tab=campaigns" className="text-brand hover:text-brand-dark">start a campaign</Link> to fund your next project
            </p>
          )}
        </div>
      </div>
    );
  }

  // Service provider analytics when services exist
  const totalServices = services.length;
  const activeServices = services.filter((s: any) => s.isActive).length;
  const featuredServices = services.filter((s: any) => s.isFeatured).length;

  return (
    <>
      {/* Service Provider Analytics */}
      {isServiceProvider && serviceProviderAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Bids</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{serviceProviderAnalytics.totalBids}</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🏆</span>
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Won Bids</div>
                <div className="text-2xl font-bold text-green-600">{serviceProviderAnalytics.wonBids}</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
                <div className="text-2xl font-bold text-green-600">${(serviceProviderAnalytics.totalEarnings / 100).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold text-blue-600">{serviceProviderAnalytics.conversionRate}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Overview */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Services ({services.length})
          </h2>
          <Link href={`/organizations/${organization.id}/settings?tab=services`} className="btn-secondary">
            Manage Services
          </Link>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalServices}</div>
              <div className="text-gray-600 dark:text-gray-400">Total Services</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeServices}</div>
              <div className="text-gray-600 dark:text-gray-400">Active</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{featuredServices}</div>
              <div className="text-gray-600 dark:text-gray-400">Featured</div>
            </div>
          </div>

          <div className="space-y-3">
            {services.slice(0, 5).map((service: any) => (
              <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{service.category.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {service.title || service.category.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {service.category.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {service.isFeatured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Featured
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    service.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
            {services.length > 5 && (
              <div className="text-center">
                <Link href={`/organizations/${organization.id}/settings?tab=services`} className="text-brand hover:text-brand-dark">
                  View all {services.length} services →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Service Provider Recent Activity */}
      {isServiceProvider && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-xl">👀</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Profile viewed by potential client
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-xl">📧</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Service inquiry received
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-xl">⭐</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Service marked as featured
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">3 days ago</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function CampaignsSidebar({ organization, canManage, totalRaised, campaigns }: any) {
  return (
    <>
      {/* Campaign Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Overview</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Raised</span>
            <span className="font-semibold text-green-600">${totalRaised.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</span>
            <span className="font-semibold text-gray-900 dark:text-white">{campaigns.filter((c: any) => c.status === 'live').length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Backers</span>
            <span className="font-semibold text-gray-900 dark:text-white">{campaigns.reduce((sum: number, c: any) => sum + c._count.pledges, 0)}</span>
          </div>
        </div>
      </div>

      {/* Campaign Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Actions</h3>
        <div className="space-y-3">
          <Link href="/campaigns/create" className="w-full btn text-center text-sm">
            🚀 Create New Campaign
          </Link>
          {canManage && (
            <Link href={`/organizations/${organization.id}/campaigns`} className="w-full btn-secondary text-center text-sm">
              📊 View All Campaigns
            </Link>
          )}
          <Link href="/campaigns/explore" className="w-full btn-secondary text-center text-sm">
            🔍 Explore Other Campaigns
          </Link>
        </div>
      </div>
    </>
  );
}

function ServicesSidebar({ organization, canManage, isServiceProvider, serviceProviderAnalytics }: any) {
  return (
    <>
      {/* Services Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Actions</h3>
        <div className="space-y-3">
          {organization.status === 'approved' && (
            <Link href={`/organizations/${organization.id}/services/new`} className="w-full btn text-center text-sm">
              ➕ Add New Service
            </Link>
          )}
          <Link href={`/services/providers/${organization.id}`} className="w-full btn-secondary text-center text-sm">
            🔗 View Public Profile
          </Link>
          <Link href="/services" className="w-full btn-secondary text-center text-sm">
            🏪 Browse Marketplace
          </Link>
          {canManage && (
            <Link href={`/organizations/${organization.id}/settings?tab=team`} className="w-full btn-secondary text-center text-sm">
              👥 Manage Team
            </Link>
          )}
        </div>
      </div>

      {/* Service Provider Performance Tips */}
      {isServiceProvider && (
        <div className="bg-gradient-to-r from-brand/10 to-brand/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💡 Performance Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Complete your profile with portfolio items</li>
            <li>• Add detailed service descriptions</li>
            <li>• Respond quickly to client inquiries</li>
            <li>• Keep your services up to date</li>
            <li>• Showcase recent work and testimonials</li>
          </ul>
        </div>
      )}
    </>
  );
}
