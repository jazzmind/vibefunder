import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteStretchGoalButton } from "./DeleteStretchGoalButton";

export default async function ManageStretchGoals({ params }: { params: Promise<{ id: string }> }) {
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
      stretchGoals: { orderBy: { order: 'asc' } }
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

  const canEdit = isOwner || isTeamMember || isAdmin;

  async function createStretchGoal(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const targetDollars = Number(formData.get("targetDollars") || 0);
    const order = Number(formData.get("order") || 1);

    if (!title || !description || targetDollars <= 0) {
      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?error=invalid-data`);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/stretch-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          campaignId: resolvedParams.id,
          title,
          description,
          targetDollars,
          order
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create stretch goal');
      }

      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?success=created`);
    } catch (error) {
      console.error('Error creating stretch goal:', error);
      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?error=create-failed`);
    }
  }

  async function deleteStretchGoal(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const stretchGoalId = formData.get("stretchGoalId") as string;

    if (!stretchGoalId) {
      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?error=invalid-id`);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/stretch-goals?id=${stretchGoalId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `session=${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete stretch goal');
      }

      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?success=deleted`);
    } catch (error) {
      console.error('Error deleting stretch goal:', error);
      redirect(`/campaigns/${resolvedParams.id}/stretch-goals?error=delete-failed`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Manage Stretch Goals</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Set ambitious funding targets to unlock additional features for {campaign.title}
            </p>
          </div>
          <Link 
            href={`/campaigns/${campaign.id}`}
            className="btn-secondary"
          >
            Back to Campaign
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Current Stretch Goals</h2>
          
          {campaign.stretchGoals.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No stretch goals created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.stretchGoals.map((goal) => {
                const isUnlocked = campaign.raisedDollars >= goal.targetDollars;
                const progress = Math.min(100, (campaign.raisedDollars / goal.targetDollars) * 100);
                
                return (
                  <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{goal.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{goal.description}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Target: ${goal.targetDollars.toLocaleString()} • Order: {goal.order}
                        </p>
                      </div>
                      {canEdit && (
                        <DeleteStretchGoalButton 
                          stretchGoalId={goal.id}
                          deleteStretchGoal={deleteStretchGoal}
                        />
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isUnlocked ? 'bg-green-500' : 'bg-brand'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {isUnlocked && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                          ✓ Unlocked!
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canEdit && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Stretch Goal</h2>
            
            <form action={createStretchGoal} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input 
                  id="title"
                  name="title" 
                  type="text"
                  required 
                  placeholder="e.g., Mobile App Development"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea 
                  id="description"
                  name="description" 
                  required 
                  rows={3}
                  placeholder="Describe what this stretch goal will unlock..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="targetDollars" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Amount ($)
                  </label>
                  <input 
                    id="targetDollars"
                    name="targetDollars" 
                    type="number"
                    required 
                    min="1"
                    placeholder="75000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order
                  </label>
                  <input 
                    id="order"
                    name="order" 
                    type="number"
                    min="1"
                    defaultValue={campaign.stretchGoals.length + 1}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn">
                Add Stretch Goal
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips for Great Stretch Goals</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Set realistic targets that excite backers</li>
                <li>• Offer meaningful value additions</li>
                <li>• Order them from lowest to highest target</li>
                <li>• Keep descriptions clear and compelling</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}