import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/app/components/DeleteButton";
import Link from "next/link";

export default async function EditCampaign({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedParams = await params;
  const searchParamsObj = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      maker: true,
      teamMembers: { include: { user: true } },
      milestones: { orderBy: { createdAt: 'asc' } },
      stretchGoals: { orderBy: { order: 'asc' } },
      pledgeTiers: { orderBy: { order: 'asc' } }
    }
  }) as any;

  // Fetch users for admin features (owner change, etc.)
  const users = session?.roles?.includes('admin') ? await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { email: 'asc' }
  }) : [];

  if (!campaign) {
    return notFound();
  }

  // Check if user has permission to edit
  const isOwner = campaign.makerId === session.userId;
  const isTeamMember = campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;
  
  if (!isOwner && !isTeamMember && !isAdmin) {
    redirect('/campaigns/' + resolvedParams.id);
  }

  // Admins can always edit fully, others follow status rules
  const canEditFully = isAdmin || campaign.status === 'draft';
  const canEditDescription = isAdmin || campaign.status === 'live';

  async function updateCampaign(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: { teamMembers: true }
    });

    if (!campaign) {
      return notFound();
    }

    const isOwner = campaign.makerId === session.userId;
    const isTeamMember = campaign.teamMembers.some(tm => tm.userId === session.userId);
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!isOwner && !isTeamMember && !isAdmin) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const updateData: any = {};

    // Always allow description changes
    const description = formData.get("description") as string;
    if (description !== undefined) {
      updateData.description = description;
    }

    // Allow full edits for draft campaigns OR if user is admin
    if (campaign.status === 'draft' || isAdmin) {
      const title = formData.get("title") as string;
      const summary = formData.get("summary") as string;
      const budget = Number(formData.get("budget") || 0);
      const fundingGoal = Number(formData.get("fundingGoal") || 0);
      const deployModes = formData.getAll("deployModes") as string[];
      const requireBackerAccount = formData.get("requireBackerAccount") === 'on';
      const onlyBackersComment = formData.get("onlyBackersComment") === 'on';
      
      updateData.title = title;
      updateData.summary = summary;
      updateData.budgetDollars = Math.round(budget);
      updateData.fundingGoalDollars = Math.round(fundingGoal);
      updateData.deployModes = deployModes.length > 0 ? deployModes : ["saas"];
      updateData.requireBackerAccount = requireBackerAccount;
      updateData.onlyBackersComment = onlyBackersComment;
    }

    try {
      await prisma.campaign.update({
        where: { id: resolvedParams.id },
        data: updateData
      });
      redirect(`/campaigns/${resolvedParams.id}?success=updated`);
    } catch (error) {
      console.error('Error updating campaign:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=update-failed`);
    }
  }

  async function deleteCampaign() {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id }
    });

    const isOwner = campaign?.makerId === session.userId;
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!campaign || (!isOwner && !isAdmin) || (campaign.status !== 'draft' && !isAdmin)) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    try {
      await prisma.campaign.delete({
        where: { id: resolvedParams.id }
      });
      redirect('/dashboard?success=campaign-deleted');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=delete-failed`);
    }
  }

  async function publishCampaign() {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id }
    });

    const isOwner = campaign?.makerId === session.userId;
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!campaign || (!isOwner && !isAdmin) || (campaign.status !== 'draft' && !isAdmin)) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    try {
      await prisma.campaign.update({
        where: { id: resolvedParams.id },
        data: { status: 'live' }
      });
      redirect(`/campaigns/${resolvedParams.id}?success=published`);
    } catch (error) {
      console.error('Error publishing campaign:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=publish-failed`);
    }
  }

  async function changeOwner(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session || !session.roles?.includes('admin')) {
      redirect('/signin');
    }

    const newOwnerId = formData.get("newOwnerId") as string;
    
    if (!newOwnerId) {
      redirect(`/campaigns/${resolvedParams.id}/edit?error=invalid-owner`);
      return;
    }

    try {
      // Verify the new owner exists
      const newOwner = await prisma.user.findUnique({
        where: { id: newOwnerId }
      });

      if (!newOwner) {
        redirect(`/campaigns/${resolvedParams.id}/edit?error=user-not-found`);
        return;
      }

      await prisma.campaign.update({
        where: { id: resolvedParams.id },
        data: { makerId: newOwnerId }
      });

      redirect(`/campaigns/${resolvedParams.id}/edit?success=owner-changed`);
    } catch (error) {
      console.error('Error changing campaign owner:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=owner-change-failed`);
    }
  }

  async function addTeamMember(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!campaign) {
      redirect('/campaigns/' + resolvedParams.id);
      return;
    }

    const isOwner = campaign.makerId === session.userId;
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!isOwner && !isAdmin) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const userEmail = formData.get("userEmail") as string;
    const role = formData.get("role") as string || "member";
    
    if (!userEmail) {
      redirect(`/campaigns/${resolvedParams.id}/edit?error=invalid-email`);
      return;
    }

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        redirect(`/campaigns/${resolvedParams.id}/edit?error=user-not-found`);
        return;
      }

      // Check if already a team member
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          campaignId_userId: {
            campaignId: resolvedParams.id,
            userId: user.id
          }
        }
      });

      if (existingMember) {
        redirect(`/campaigns/${resolvedParams.id}/edit?error=user-already-member`);
        return;
      }

      await prisma.teamMember.create({
        data: {
          campaignId: resolvedParams.id,
          userId: user.id,
          role: role
        }
      });

      redirect(`/campaigns/${resolvedParams.id}/edit?success=member-added`);
    } catch (error) {
      console.error('Error adding team member:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=member-add-failed`);
    }
  }

  async function removeTeamMember(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!campaign) {
      redirect('/campaigns/' + resolvedParams.id);
      return;
    }

    const isOwner = campaign.makerId === session.userId;
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!isOwner && !isAdmin) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const memberId = formData.get("memberId") as string;
    
    if (!memberId) {
      redirect(`/campaigns/${resolvedParams.id}/edit?error=invalid-member`);
      return;
    }

    try {
      await prisma.teamMember.delete({
        where: { id: memberId }
      });

      redirect(`/campaigns/${resolvedParams.id}/edit?success=member-removed`);
    } catch (error) {
      console.error('Error removing team member:', error);
      redirect(`/campaigns/${resolvedParams.id}/edit?error=member-remove-failed`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Edit Campaign
        </h1>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            campaign.status === 'draft' 
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
          {!canEditFully && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Campaign is live - only description can be edited
            </p>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {searchParamsObj.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">
            {searchParamsObj.error === 'update-failed' && 'Failed to update campaign. Please try again.'}
            {searchParamsObj.error === 'delete-failed' && 'Failed to delete campaign. Please try again.'}
            {searchParamsObj.error === 'publish-failed' && 'Failed to publish campaign. Please try again.'}
            {searchParamsObj.error === 'invalid-owner' && 'Invalid owner selected.'}
            {searchParamsObj.error === 'user-not-found' && 'User not found. Please check the email address.'}
            {searchParamsObj.error === 'owner-change-failed' && 'Failed to change campaign owner. Please try again.'}
            {searchParamsObj.error === 'invalid-email' && 'Please provide a valid email address.'}
            {searchParamsObj.error === 'user-already-member' && 'User is already a team member.'}
            {searchParamsObj.error === 'member-add-failed' && 'Failed to add team member. Please try again.'}
            {searchParamsObj.error === 'invalid-member' && 'Invalid team member selected.'}
            {searchParamsObj.error === 'member-remove-failed' && 'Failed to remove team member. Please try again.'}
            {!['update-failed', 'delete-failed', 'publish-failed', 'invalid-owner', 'user-not-found', 'owner-change-failed', 'invalid-email', 'user-already-member', 'member-add-failed', 'invalid-member', 'member-remove-failed'].includes(searchParamsObj.error) && 'An error occurred.'}
          </p>
        </div>
      )}
      
      {searchParamsObj.success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-300">
            {searchParamsObj.success === 'updated' && 'Campaign updated successfully.'}
            {searchParamsObj.success === 'published' && 'Campaign published successfully.'}
            {searchParamsObj.success === 'owner-changed' && 'Campaign owner changed successfully.'}
            {searchParamsObj.success === 'member-added' && 'Team member added successfully.'}
            {searchParamsObj.success === 'member-removed' && 'Team member removed successfully.'}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form action={updateCampaign} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Title
              </label>
              <input 
                id="title"
                name="title" 
                defaultValue={campaign.title}
                disabled={!canEditFully}
                required 
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  !canEditFully ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Summary
              </label>
              <textarea 
                id="summary"
                name="summary" 
                defaultValue={campaign.summary}
                disabled={!canEditFully}
                required 
                rows={2}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  !canEditFully ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Description
              </label>
              <textarea 
                id="description"
                name="description" 
                defaultValue={campaign.description || ''}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {!canEditFully && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ You can edit this field even when the campaign is live
                </p>
              )}
            </div>

            {canEditFully && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fundingGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Funding Goal ($)
                    </label>
                    <input 
                      id="fundingGoal"
                      name="fundingGoal" 
                      type="number" 
                      step="1"
                      defaultValue={campaign.fundingGoalDollars}
                      required 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Budget ($)
                    </label>
                    <input 
                      id="budget"
                      name="budget" 
                      type="number" 
                      step="1"
                      defaultValue={campaign.budgetDollars}
                      required 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Deployment Options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="deployModes" 
                        value="saas" 
                        defaultChecked={campaign.deployModes.includes('saas')}
                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">SaaS (Cloud hosted)</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="deployModes" 
                        value="vpc" 
                        defaultChecked={campaign.deployModes.includes('vpc')}
                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">VPC (Private cloud)</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="deployModes" 
                        value="onprem" 
                        defaultChecked={campaign.deployModes.includes('onprem')}
                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">On-premises</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Backer & Comment Settings
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="requireBackerAccount" 
                        defaultChecked={campaign.requireBackerAccount}
                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Require account to back this campaign</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="onlyBackersComment" 
                        defaultChecked={campaign.onlyBackersComment}
                        className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Only backers can comment</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-4">
              <button type="submit" className="btn">
                Save Changes
              </button>
              <a href={`/campaigns/${campaign.id}`} className="btn-secondary">
                Cancel
              </a>
            </div>
          </form>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Milestone Management */}
          {canEditFully && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Milestones</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {campaign.milestones.length === 0 
                    ? 'No milestones created yet.'
                    : `${campaign.milestones.length} milestone${campaign.milestones.length !== 1 ? 's' : ''} configured.`
                  }
                </p>
                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/campaigns/${campaign.id}/milestones`}
                    className="btn w-full text-center"
                  >
                    {campaign.milestones.length === 0 ? 'Create Milestones' : 'Manage Milestones'}
                  </Link>
                  <Link 
                    href={`/campaigns/${campaign.id}#milestones`}
                    className="btn-secondary w-full text-center"
                  >
                    View on Campaign Page
                  </Link>
                </div>
                {campaign.milestones.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {campaign.milestones.slice(0, 3).map((milestone) => (
                      <div key={milestone.id} className="flex justify-between">
                        <span className="truncate">{milestone.name}</span>
                        <span>{milestone.pct}%</span>
                      </div>
                    ))}
                    {campaign.milestones.length > 3 && (
                      <div className="text-center">
                        +{campaign.milestones.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stretch Goals Management */}
          {canEditFully && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stretch Goals</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {campaign.stretchGoals.length === 0 
                    ? 'No stretch goals created yet.'
                    : `${campaign.stretchGoals.length} stretch goal${campaign.stretchGoals.length !== 1 ? 's' : ''} configured.`
                  }
                </p>
                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/campaigns/${campaign.id}/stretch-goals`}
                    className="btn w-full text-center"
                  >
                    {campaign.stretchGoals.length === 0 ? 'Create Stretch Goals' : 'Manage Stretch Goals'}
                  </Link>
                  <Link 
                    href={`/campaigns/${campaign.id}#stretch-goals`}
                    className="btn-secondary w-full text-center"
                  >
                    View on Campaign Page
                  </Link>
                </div>
                {campaign.stretchGoals.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {campaign.stretchGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="flex justify-between">
                        <span className="truncate">{goal.title}</span>
                        <span>${(goal.targetDollars / 1000).toFixed(0)}k</span>
                      </div>
                    ))}
                    {campaign.stretchGoals.length > 3 && (
                      <div className="text-center">
                        +{campaign.stretchGoals.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pledge Tiers Management */}
          {canEditFully && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pledge Tiers</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {campaign.pledgeTiers.length === 0 
                    ? 'Using default pledge tiers.'
                    : `${campaign.pledgeTiers.length} custom tier${campaign.pledgeTiers.length !== 1 ? 's' : ''} configured.`
                  }
                </p>
                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/campaigns/${campaign.id}/pledge-tiers`}
                    className="btn w-full text-center"
                  >
                    {campaign.pledgeTiers.length === 0 ? 'Customize Pledge Tiers' : 'Manage Pledge Tiers'}
                  </Link>
                  <Link 
                    href={`/campaigns/${campaign.id}#pledge`}
                    className="btn-secondary w-full text-center"
                  >
                    View Pledge Widget
                  </Link>
                </div>
                {campaign.pledgeTiers.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    {campaign.pledgeTiers.slice(0, 3).map((tier) => (
                      <div key={tier.id} className="flex justify-between">
                        <span className="truncate">{tier.title}</span>
                        <span>${(tier.amountDollars / 1000).toFixed(0)}k</span>
                      </div>
                    ))}
                    {campaign.pledgeTiers.length > 3 && (
                      <div className="text-center">
                        +{campaign.pledgeTiers.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {campaign.status === 'draft' && isOwner && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Publish Campaign</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Once published, you can only edit the description. Make sure everything is ready!
              </p>
              <form action={publishCampaign} className="mb-4">
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Publish Campaign
                </button>
              </form>
            </div>
          )}

          {campaign.status === 'draft' && isOwner && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">Danger Zone</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Delete this draft campaign. This action cannot be undone.
              </p>
              <form action={deleteCampaign}>
                <DeleteButton 
                  confirmMessage="Are you sure you want to delete this campaign? This action cannot be undone."
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Campaign
                </DeleteButton>
              </form>
            </div>
          )}

          {/* Admin Features */}
          {isAdmin && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">Admin Features</h3>
              
              {/* Change Owner */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Change Owner</h4>
                <form action={changeOwner} className="space-y-3">
                  <select 
                    name="newOwnerId" 
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  >
                    <option value="">Select new owner...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email} ({user.email})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors">
                    Change Owner
                  </button>
                </form>
              </div>

              {/* Add Team Member */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Add Team Member</h4>
                <form action={addTeamMember} className="space-y-3">
                  <input 
                    type="email" 
                    name="userEmail" 
                    placeholder="User email address"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  />
                  <select 
                    name="role"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors">
                    Add Member
                  </button>
                </form>
              </div>

              {/* Team Members List */}
              {campaign.teamMembers && campaign.teamMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Team Members</h4>
                  <div className="space-y-2">
                    {campaign.teamMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
                        <div className="text-xs">
                          <div className="font-medium">{member.user.name || member.user.email}</div>
                          <div className="text-gray-500 dark:text-gray-400">{member.role}</div>
                        </div>
                        <form action={removeTeamMember} className="inline">
                          <input type="hidden" name="memberId" value={member.id} />
                          <button 
                            type="submit" 
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Delete (for any status) */}
          {isAdmin && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">Admin Danger Zone</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                As an admin, you can delete campaigns in any status. This action cannot be undone.
              </p>
              <form action={deleteCampaign}>
                <DeleteButton 
                  confirmMessage="Are you sure you want to delete this campaign? This action cannot be undone and will remove all associated data."
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Admin Delete Campaign
                </DeleteButton>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}