import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CampaignSearch } from "./search";

// Demo campaigns for non-authenticated users
const DEMO_CAMPAIGNS = [
  {
    id: 'demo-1',
    title: 'TaskBuddy - AI-Powered Project Manager',
    summary: 'Revolutionary AI tool that helps teams organize and prioritize tasks automatically',
    raisedDollars: 45000,
    fundingGoalDollars: 100000,
    budgetDollars: 80000,
    status: 'live',
    deployModes: ['cloud', 'saas'],
    maker: { name: 'Sarah Chen', email: 'sarah@example.com' },
    pledges: [],
    _count: { pledges: 127, comments: 23 },
    createdAt: new Date('2024-01-15'),
    endsAt: new Date('2024-02-15')
  },
  {
    id: 'demo-2', 
    title: 'CodeFlow - Developer Workflow Optimizer',
    summary: 'Streamline your development process with intelligent code review and deployment automation',
    raisedDollars: 78000,
    fundingGoalDollars: 120000,
    budgetDollars: 95000,
    status: 'live',
    deployModes: ['on-premise', 'cloud'],
    maker: { name: 'Alex Rivera', email: 'alex@example.com' },
    pledges: [],
    _count: { pledges: 203, comments: 45 },
    createdAt: new Date('2024-01-10'),
    endsAt: new Date('2024-02-10')
  },
  {
    id: 'demo-3',
    title: 'DataViz Pro - Interactive Analytics Dashboard',
    summary: 'Transform complex data into beautiful, interactive visualizations with no coding required',
    raisedDollars: 92000,
    fundingGoalDollars: 80000,
    budgetDollars: 75000,
    status: 'funded',
    deployModes: ['saas', 'self-hosted'],
    maker: { name: 'Jamie Park', email: 'jamie@example.com' },
    pledges: [],
    _count: { pledges: 156, comments: 34 },
    createdAt: new Date('2024-01-05'),
    endsAt: new Date('2024-02-05')
  }
];

export default async function Campaigns({
  searchParams
}: {
  searchParams: Promise<{ 
    search?: string; 
    status?: string; 
    sort?: string;
    deployment?: string;
  }>
}){
  const params = await searchParams;
  const { search, status, sort, deployment } = params;
  
  // Check if user is authenticated
  const session = await auth();
  const isAuthenticated = !!session?.user;
  
  let campaigns: any[] = [];

  if (isAuthenticated) {
    // Build the where clause based on filters for authenticated users
    const where: any = {
      status: { in: ['live', 'funded', 'completed'] } // Only show public campaigns
    };
    
    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Add deployment mode filter
    if (deployment && deployment !== 'all') {
      where.deployModes = { has: deployment };
    }
    
    // Build the orderBy clause
    let orderBy: any = { createdAt: "desc" };
    if (sort === 'funding') {
      orderBy = { raisedDollars: "desc" };
    } else if (sort === 'goal') {
      orderBy = { fundingGoalDollars: "desc" };
    } else if (sort === 'progress') {
      // For progress, we'll need to sort by calculated field later
      orderBy = { createdAt: "desc" };
    }
    
    campaigns = await prisma.campaign.findMany({
      where,
      orderBy,
      include: { 
        maker: true,
        _count: {
          select: {
            pledges: true,
            comments: true
          }
        }
      },
      distinct: ['id'] // Prevent duplicates
    });
  } else {
    // Use demo campaigns for non-authenticated users
    campaigns = DEMO_CAMPAIGNS.filter(campaign => {
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        return campaign.title.toLowerCase().includes(searchTerm) ||
               campaign.summary.toLowerCase().includes(searchTerm);
      }
      
      // Apply status filter  
      if (status && status !== 'all') {
        return campaign.status === status;
      }
      
      // Apply deployment filter
      if (deployment && deployment !== 'all') {
        return campaign.deployModes.includes(deployment);
      }
      
      return true;
    });
    
    // Apply sorting for demo campaigns
    if (sort === 'funding') {
      campaigns.sort((a, b) => b.raisedDollars - a.raisedDollars);
    } else if (sort === 'goal') {
      campaigns.sort((a, b) => b.fundingGoalDollars - a.fundingGoalDollars);
    } else {
      campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }
  
  // Sort by progress if requested (calculated field)
  let sortedCampaigns = campaigns;
  if (sort === 'progress') {
    sortedCampaigns = campaigns.sort((a, b) => {
      const progressA = a.fundingGoalDollars > 0 ? a.raisedDollars / a.fundingGoalDollars : 0;
      const progressB = b.fundingGoalDollars > 0 ? b.raisedDollars / b.fundingGoalDollars : 0;
      return progressB - progressA;
    });
  }
  
  return(
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {search ? `Search Results for "${search}"` : 'Discover Campaigns'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {search 
              ? `Found ${sortedCampaigns.length} campaign${sortedCampaigns.length !== 1 ? 's' : ''}`
              : 'Discover and back innovative AI-native micro-SaaS projects'
            }
          </p>
        </div>
        
        {/* Search and Filters */}
        <CampaignSearch />
        
        {sortedCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {search ? 'No campaigns found' : 'No campaigns yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search 
                ? `Try adjusting your search or filters to find what you're looking for.`
                : 'Be the first to create a campaign and start building something amazing!'
              }
            </p>
            {search && (
              <button 
                onClick={() => window.location.href = '/campaigns'}
                className="btn-secondary"
              >
                View All Campaigns
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {sortedCampaigns.map(campaign => {
            const fundingProgress = (campaign.raisedDollars / campaign.fundingGoalDollars);
            const daysLeft = campaign.endsAt ? Math.max(0, Math.ceil((campaign.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
            
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        campaign.status === 'live' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        campaign.status === 'draft' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                        'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                      {daysLeft !== null && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {daysLeft === 0 ? 'Last day!' : `${daysLeft} days left`}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand transition-colors">
                      {campaign.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {campaign.summary}
                    </p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ${(campaign.raisedDollars).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          of ${(campaign.fundingGoalDollars).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-brand h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, fundingProgress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{Math.round(fundingProgress)}% funded</span>
                        <span>Budget: ${(campaign.budgetDollars).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600 dark:text-gray-400">
                        by {campaign.maker.name || campaign.maker.email.split('@')[0]}
                      </span>
                      <div className="flex gap-1">
                        {campaign.deployModes.slice(0, 2).map((mode: any) => (
                          <span key={mode} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {mode.toUpperCase()}
                          </span>
                        ))}
                        {campaign.deployModes.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            +{campaign.deployModes.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Campaign Stats */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Backers:</span>
                        <span className="font-medium">{campaign._count.pledges}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Comments:</span>
                        <span className="font-medium">{campaign._count.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
        )}
        
        {/* Signup prompt for non-authenticated users */}
        {!isAuthenticated && (
          <div className="bg-gradient-to-r from-brand/10 to-purple-600/10 rounded-2xl p-8 mb-8 border border-brand/20">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Want to see more campaigns and back projects?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Join VibeFunder to access our complete catalog of innovative campaigns, back projects you believe in, 
                and connect with creators building the future of AI-native software.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link className="btn" href="/signin">
                  Join the Community
                </Link>
                <a 
                  href="#demo-campaigns" 
                  className="btn-secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('.grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Demo Campaigns
                </a>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                These are example campaigns to show you what VibeFunder offers
              </p>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isAuthenticated ? 'Ready to launch your campaign?' : 'Interested in creating your own campaign?'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isAuthenticated 
              ? 'Turn your demo into dependable software with milestone-based escrow funding. Connect with charter customers who need what you\'re building.'
              : 'VibeFunder helps creators turn demos into dependable software with milestone-based escrow funding. Join our community to start your journey.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {isAuthenticated ? (
              <>
                <Link className="btn" href="/dashboard/new-campaign">Create Campaign</Link>
                <Link className="btn-secondary" href="/#how">Learn How It Works</Link>
              </>
            ) : (
              <>
                <Link className="btn" href="/signin">Join VibeFunder</Link>
                <Link className="btn-secondary" href="/#how">Learn How It Works</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}