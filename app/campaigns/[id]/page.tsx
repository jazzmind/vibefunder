import { prisma } from "@/lib/db";
import { PledgeButton } from "./client";
import { ArtifactUploader } from "./uploader";
import { CommentSection } from "./comments";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import ImageGenerator from "@/components/campaign/ImageGenerator";
import AutoImageGenerationWrapper from "./AutoImageGenerationWrapper";
import { DEMO_CAMPAIGNS } from "@/app/demo/campaigns";
import VideoEmbed from '@/components/campaign/VideoEmbed';


export default async function CampaignPage({params}:{params:Promise<{id:string}>}){
  const resolvedParams = await params;
  
  // Get current user session
  const session = await auth();
  
  // Check if this is a demo campaign
  const demoCampaign = DEMO_CAMPAIGNS.find(c => c.id === resolvedParams.id);
  
  let campaign;
  
  if (demoCampaign) {
    // Use demo campaign data
    campaign = demoCampaign;
  } else {
    // Fetch real campaign from database
    campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        milestones: true, 
        stretchGoals: { orderBy: { order: 'asc' } },
        pledgeTiers: { where: { isActive: true }, orderBy: { order: 'asc' } },
        maker: true,
        teamMembers: { include: { user: true } },
        comments: {
          include: { user: true, replies: { include: { user: true } } },
          where: { parentId: null },
          orderBy: { createdAt: 'desc' }
        },
        pledges: session ? { where: { backerId: session.user.id } } : false
      }
    }) as any;
  }
  
  if (!campaign) return notFound();
  
  const fundingProgress = (campaign.raisedDollars / campaign.fundingGoalDollars);
  const daysLeft = campaign.endsAt ? Math.max(0, Math.ceil((campaign.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  
  // Check user permissions
  const isDemo = demoCampaign ? true : false;
  const isOwner = session && campaign.maker?.id === session.user?.id;
  const isTeamMember = session && campaign.teamMembers?.some((tm: any) => tm.userId === session.user?.id);
  const canEdit = isOwner || isTeamMember;
  const isBacker = (campaign.pledges as any)?.length > 0;
  const canComment = session && (!campaign.onlyBackersComment || isBacker || canEdit);
  
  return(
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Auto Image Generation for new campaigns */}
      {!isDemo && (
        <AutoImageGenerationWrapper 
          campaignId={campaign.id}
          hasImage={!!campaign.image}
          isOwner={!!isOwner}
        />
      )}
      
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center text-center">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎭</span>
                <span className="font-semibold">DEMO CAMPAIGN</span>
                <span>•</span>
                <span className="text-sm">This is an example campaign to showcase VibeFunder's features</span>
                <span>•</span>
                <Link href="/signin" className="text-sm underline hover:no-underline">
                  Sign up to view real campaigns
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Campaign Image */}
              {campaign.image && (
                <div className="aspect-video w-full overflow-hidden rounded-2xl mb-8">
                  <img 
                    src={campaign.image} 
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 mb-4">
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">{campaign.title}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">{campaign.summary}</p>
           
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>by <strong className="text-gray-900 dark:text-white">{(campaign.maker as any)?.name || (campaign.maker as any)?.email}</strong></span>
                  <span>•</span>
                  <span>{campaign.deployModes.join(", ")} deployment</span>
                </div>
                
                {canEdit && !isDemo && (
                  <div className="flex gap-2">
                    <Link 
                      href={`/campaigns/${campaign.id}/edit`}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    {campaign.status === 'draft' && (
                      <Link 
                        href={`/campaigns/${campaign.id}/milestones`}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Milestones
                      </Link>
                    )}
                    <Link 
                      href={`/campaigns/${campaign.id}/team`}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Team
                    </Link>
                    <Link 
                      href={`/campaigns/${campaign.id}/updates`}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Updates
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Lead Video */}
              {campaign.leadVideoUrl && (
                <div className="mt-8">
                  <VideoEmbed 
                    url={campaign.leadVideoUrl} 
                    title={`${campaign.title} - Campaign Video`}
                    className="w-full"
                  />
                </div>
              )}
              
              {/* Campaign Description */}
              {campaign.description && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About This Campaign</h3>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: campaign.description }}
                  />
                </div>
              )}
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${(campaign.raisedDollars).toLocaleString()}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      of ${(campaign.fundingGoalDollars).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-4">
                    <div 
                      className="bg-brand h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, fundingProgress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{Math.round(fundingProgress * 100)}% funded</span>
                    {daysLeft !== null && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {daysLeft === 0 ? 'Last day!' : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                </div>
                {isDemo ? (
                  <div className="text-center">
                    <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        🎭 This is a demo campaign. <Link href="/signin" className="text-brand hover:underline">Sign up</Link> to back real campaigns!
                      </p>
                    </div>
                    <div className="space-y-3">
                      {campaign.pledgeTiers.map((tier: any, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 opacity-60">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{tier.title}</h4>
                            <span className="font-bold text-brand">${tier.amount}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tier.description}</p>
                          <div className="text-xs text-gray-500">
                            {tier.currentBackers} / {tier.maxBackers} claimed
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <PledgeButton campaignId={campaign.id} pledgeTiers={campaign.pledgeTiers} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Milestones */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Development Milestones</h3>
                {canEdit && !isDemo && (
                  <Link 
                    href={`/campaigns/${campaign.id}/milestones`}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Manage Milestones
                  </Link>
                )}
              </div>
              <div className="space-y-6">
                {(campaign.milestones as any)?.map((milestone: any, index: number) => (
                  <div key={milestone.id} className="relative">
                    {index < (campaign.milestones as any)?.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200 dark:bg-gray-600" />
                    )}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white
                          ${milestone.status === 'completed' ? 'bg-green-500' : 
                            milestone.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`}>
                          {milestone.status === 'completed' ? '✓' : index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{milestone.name || 'Untitled Milestone'}</h4>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{milestone.pct || 0}%</span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-300 mb-3">
                          {(milestone.acceptance as any)?.checklist && (
                            <ul className="list-disc list-inside space-y-1">
                              {(milestone.acceptance as any).checklist.map((item: string, i: number) => (
                                <li key={i} className="text-sm">{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full
                          ${milestone.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                          {milestone.status ? milestone.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stretch Goals */}
            {((campaign.stretchGoals as any)?.length > 0 || canEdit) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Stretch Goals</h3>
                  {canEdit && (
                    <Link 
                      href={`/campaigns/${campaign.id}/stretch-goals`}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      Manage Stretch Goals
                    </Link>
                  )}
                </div>
                <div className="space-y-4">
                  {(campaign.stretchGoals as any)?.map((goal: any) => {
                    const isUnlocked = campaign.raisedDollars >= goal.targetDollars;
                    const progress = Math.min(100, (campaign.raisedDollars / goal.targetDollars));
                    
                    return (
                      <div key={goal.id} className={`p-6 rounded-xl border-2 transition-all ${
                        isUnlocked 
                          ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.title}</h4>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">{goal.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              ${goal.targetDollars ? goal.targetDollars.toLocaleString() : '0'}
                            </div>
                            {isUnlocked ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                                ✓ Unlocked
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isUnlocked ? 'bg-green-500' : 'bg-brand'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isDemo ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Comments</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Comments are available on real campaigns
                  </p>
                  <Link href="/signin" className="btn">
                    Sign up to join discussions
                  </Link>
                </div>
              </div>
            ) : (
              <CommentSection 
                campaignId={campaign.id} 
                comments={(campaign.comments as any) || []} 
                currentUser={session ? {
                  userId: session.user.id,
                  email: session.user.email,
                  roles: session.user.roles
                } : null}
                canComment={!!canComment}
                teamMemberIds={(campaign.teamMembers as any)?.map((tm: any) => tm.userId) || []}
              />
            )}
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            {!isDemo && <ArtifactUploader campaignId={campaign.id} />}
            
            {/* Image Generator for campaign owners */}
            {!isDemo && canEdit && (
              <ImageGenerator 
                campaignId={campaign.id} 
                currentImage={campaign.image} 
              />
            )}
            
            {/* Campaign Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Details</h4>
              <div className="space-y-4">

                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Launch Date</span>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {campaign.createdAt.toLocaleDateString()}
                  </div>
                </div>
                {campaign.endsAt && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Campaign Ends</span>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {campaign.endsAt.toLocaleDateString()}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Deployment Options</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaign.deployModes.map((mode: any) => (
                      <span key={mode} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                        {mode.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Sectors */}
                {campaign.sectors && campaign.sectors.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sectors</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {campaign.sectors.map((sector: any) => (
                        <span key={sector} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded">
                          {sector.charAt(0).toUpperCase() + sector.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}