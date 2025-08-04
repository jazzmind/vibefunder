import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { DeleteMilestoneButton } from "./DeleteMilestoneButton";

export default async function ManageMilestones({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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
      milestones: { orderBy: { createdAt: 'asc' } }
    }
  });

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

  const canEdit = isAdmin || campaign.status === 'draft';

  async function addMilestone(formData: FormData) {
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

    if (!campaign || campaign.status !== 'draft') {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const isOwner = campaign.makerId === session.userId;
    const isTeamMember = campaign.teamMembers.some(tm => tm.userId === session.userId);
    
    if (!isOwner && !isTeamMember) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const name = formData.get("name") as string;
    const pct = Number(formData.get("pct") || 0);
    const checklist = formData.get("checklist") as string;
    
    await prisma.milestone.create({
      data: {
        campaignId: resolvedParams.id,
        name,
        pct,
        acceptance: {
          checklist: checklist.split('\n').filter(item => item.trim()).map(item => item.trim())
        }
      }
    });

    redirect(`/campaigns/${resolvedParams.id}/milestones`);
  }

  async function deleteMilestone(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const milestoneId = formData.get("milestoneId") as string;
    
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { campaign: { include: { teamMembers: true } } }
    });

    if (!milestone || milestone.campaign.status !== 'draft') {
      redirect('/campaigns/' + resolvedParams.id + '/milestones');
    }

    const isOwner = milestone.campaign.makerId === session.userId;
    const isTeamMember = milestone.campaign.teamMembers.some(tm => tm.userId === session.userId);
    
    if (!isOwner && !isTeamMember) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    await prisma.milestone.delete({
      where: { id: milestoneId }
    });

    redirect(`/campaigns/${resolvedParams.id}/milestones`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Manage Milestones
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Campaign: {campaign.title}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            campaign.status === 'draft' 
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
          {!canEdit && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Campaign is live - milestones cannot be edited
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Current Milestones</h2>
          
          {campaign.milestones.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No milestones created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.milestones.map((milestone) => (
                <div key={milestone.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{milestone.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{milestone.pct}% of project completion</p>
                    </div>
                    {canEdit && (
                      <DeleteMilestoneButton 
                        milestoneId={milestone.id}
                        deleteMilestone={deleteMilestone}
                      />
                    )}
                  </div>
                  
                  {(milestone.acceptance as any)?.checklist && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Acceptance Criteria:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {(milestone.acceptance as any).checklist.map((item: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600 dark:text-gray-400">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Milestone</h2>
            
            <form action={addMilestone} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Milestone Name
                </label>
                <input 
                  id="name"
                  name="name" 
                  placeholder="e.g., M1 Security & Identity"
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="pct" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Completion Percentage
                </label>
                <input 
                  id="pct"
                  name="pct" 
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g., 30"
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  What percentage of the total project does this milestone represent?
                </p>
              </div>

              <div>
                <label htmlFor="checklist" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acceptance Criteria
                </label>
                <textarea 
                  id="checklist"
                  name="checklist" 
                  placeholder="Enter each criteria on a new line:&#10;SSO Integration&#10;RBAC Implementation&#10;Audit Log System"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter each acceptance criteria on a separate line
                </p>
              </div>

              <button type="submit" className="w-full btn">
                Add Milestone
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <a href={`/campaigns/${campaign.id}/edit`} className="btn-secondary">
          Back to Edit Campaign
        </a>
        <a href={`/campaigns/${campaign.id}`} className="btn-secondary">
          View Campaign
        </a>
      </div>
    </div>
  );
}