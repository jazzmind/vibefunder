'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Icon mapping function to replace emojis with SVG icons
function getTabIcon(iconName: string) {
  const icons: { [key: string]: React.JSX.Element } = {
    rocket: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    heart: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    tools: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  };
  return icons[iconName] || null;
}

interface DashboardTabsProps {
  defaultTab: string;
  hasCampaigns: boolean;
  hasServices: boolean;
  hasBackedCampaigns: boolean;
  isServiceProvider: boolean;
  isOnlyBacker: boolean;
  campaigns: any[];
  backedCampaigns: any[];
  services: any[];
  organization: any;
  canManage: boolean;
  serviceProviderAnalytics?: any;
  totalRaised: number;
  totalBacked: number;
  liveCampaigns: any[];
  draftCampaigns: any[];
}

export default function DashboardTabs({
  defaultTab,
  hasCampaigns,
  hasServices,
  hasBackedCampaigns,
  isServiceProvider,
  isOnlyBacker,
  campaigns,
  backedCampaigns,
  services,
  organization,
  canManage,
  serviceProviderAnalytics,
  totalRaised,
  totalBacked,
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
    // Only show campaigns tab if user has campaigns or can create them (not just a backer)
    ...(!isOnlyBacker ? [{
      id: 'campaigns',
      label: 'Campaigns',
      icon: 'rocket',
      count: campaigns.length
    }] : []),
    // Show backed campaigns tab if user has backed campaigns
    ...(hasBackedCampaigns ? [{
      id: 'backed',
      label: 'Backed',
      icon: 'heart',
      count: backedCampaigns.length
    }] : []),
    // Only show services tab if user can manage or has services
    ...(!isOnlyBacker ? [{
      id: 'services',
      label: 'Services',
      icon: 'tools',
      count: services.length
    }] : [])
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
              {getTabIcon(tab.icon)}
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

          {activeTab === 'backed' && (
            <BackedCampaignsTabContent
              backedCampaigns={backedCampaigns}
              totalBacked={totalBacked}
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
          ) : activeTab === 'backed' ? (
            <BackedCampaignsSidebar 
              totalBacked={totalBacked}
              backedCampaigns={backedCampaigns}
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

function BackedCampaignsTabContent({ 
  backedCampaigns, 
  totalBacked 
}: { 
  backedCampaigns: any[];
  totalBacked: number;
}) {
  return (
    <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Backed</h3>
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${totalBacked.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Campaigns Backed</h3>
            <span className="text-2xl">❤️</span>
          </div>
          <div className="text-2xl font-bold text-brand">{backedCampaigns.length}</div>
        </div>
      </div>

      {/* Backed Campaigns */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Your Backed Campaigns ({backedCampaigns.length})
        </h2>
        
        {backedCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No backed campaigns yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start supporting amazing projects by browsing and backing campaigns!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {backedCampaigns.map((campaign: any) => {
              const userPledge = campaign.pledges[0];
              const fundingProgress = (campaign.raisedDollars / campaign.fundingGoalDollars) * 100;
              
              return (
                <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Link href={`/campaigns/${campaign.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors">{campaign.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          by {campaign.maker.name || campaign.maker.email.split('@')[0]}
                        </p>
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
                      <div className="ml-4 text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Your pledge</div>
                        <div className="text-lg font-semibold text-brand">${userPledge.amountDollars.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(userPledge.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function BackedCampaignsSidebar({ 
  totalBacked, 
  backedCampaigns 
}: { 
  totalBacked: number;
  backedCampaigns: any[];
}) {
  const activeCampaigns = backedCampaigns.filter(c => c.status === 'live');
  const completedCampaigns = backedCampaigns.filter(c => c.status === 'completed');
  
  return (
    <>
      {/* Backing Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Backing Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Invested</span>
            <span className="font-semibold text-gray-900 dark:text-white">${totalBacked.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Active Campaigns</span>
            <span className="font-semibold text-gray-900 dark:text-white">{activeCampaigns.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
            <span className="font-semibold text-gray-900 dark:text-white">{completedCampaigns.length}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {backedCampaigns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Backing Activity</h3>
          <div className="space-y-3">
            {backedCampaigns.slice(0, 3).map((campaign: any) => (
              <div key={campaign.id} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-brand rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{campaign.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${campaign.pledges[0].amountDollars.toLocaleString()} • {new Date(campaign.pledges[0].createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
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
        <svg className="w-16 h-16 mx-auto mb-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
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
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>Great news! You already have services listed. Consider creating a campaign to fund expansion of your service offerings or develop new solutions.
            </p>
          </div>
        )}
        <div className="space-y-3">
          <Link href="/campaigns/create" className="btn inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
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
              <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <Link href={`/campaigns/${campaign.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors">{campaign.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{campaign.summary}</p>
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>Goal: ${campaign.fundingGoalDollars.toLocaleString()}</span>
                        <span>Milestones: {campaign._count.milestones}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Link 
                        href={`/campaigns/${campaign.id}/edit`} 
                        className="btn-secondary text-sm px-3 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </Link>
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
                <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Link href={`/campaigns/${campaign.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-lg group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors">{campaign.title}</h3>
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
                        <Link 
                          href={`/campaigns/${campaign.id}/edit`} 
                          className="btn-secondary text-sm px-3 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </Link>
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
