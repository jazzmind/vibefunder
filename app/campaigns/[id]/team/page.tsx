import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function ManageTeam({ params }: { params: Promise<{ id: string }> }) {
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
      teamMembers: { 
        include: { user: true },
        orderBy: { joinedAt: 'asc' }
      }
    }
  });

  if (!campaign) {
    return notFound();
  }

  // Check if user has permission to manage team
  const isOwner = campaign.makerId === session.userId;
  const currentTeamMember = campaign.teamMembers.find(tm => tm.userId === session.userId);
  const isTeamAdmin = currentTeamMember?.role === 'admin';
  const isPlatformAdmin = session.roles?.includes('admin') || false;
  
  if (!isOwner && !isTeamAdmin && !isPlatformAdmin) {
    redirect('/campaigns/' + resolvedParams.id);
  }

  async function addTeamMember(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as string;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      redirect(`/campaigns/${resolvedParams.id}/team?error=user-not-found`);
      return;
    }

    // Check if user is already a team member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        campaignId_userId: {
          campaignId: resolvedParams.id,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      redirect(`/campaigns/${resolvedParams.id}/team?error=already-member`);
      return;
    }

    await prisma.teamMember.create({
      data: {
        campaignId: resolvedParams.id,
        userId: user.id,
        role
      }
    });

    redirect(`/campaigns/${resolvedParams.id}/team`);
  }

  async function updateMemberRole(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const memberId = formData.get("memberId") as string;
    const role = formData.get("role") as string;

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { role }
    });

    redirect(`/campaigns/${resolvedParams.id}/team`);
  }

  async function removeMember(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const memberId = formData.get("memberId") as string;

    await prisma.teamMember.delete({
      where: { id: memberId }
    });

    redirect(`/campaigns/${resolvedParams.id}/team`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Team Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Campaign: {campaign.title}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Current Team</h2>
          
          {/* Campaign Owner */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-semibold">
                  {(campaign.maker.name || campaign.maker.email).charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.maker.name || campaign.maker.email.split('@')[0]}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{campaign.maker.email}</p>
                </div>
              </div>
              <span className="px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                Owner
              </span>
            </div>
          </div>

          {/* Team Members */}
          {campaign.teamMembers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No team members added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.teamMembers.map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white font-semibold">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {member.user.name || member.user.email.split('@')[0]}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.user.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        member.role === 'admin'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {member.role}
                      </span>
                      
                      {isOwner && (
                        <div className="flex gap-1">
                          <details className="relative">
                            <summary className="cursor-pointer text-brand hover:text-brand-dark text-sm">
                              Change Role
                            </summary>
                            <div className="absolute top-6 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 w-32">
                              <form action={updateMemberRole}>
                                <input type="hidden" name="memberId" value={member.id} />
                                <div className="space-y-2">
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="role" 
                                      value="member" 
                                      defaultChecked={member.role === 'member'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Member</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input 
                                      type="radio" 
                                      name="role" 
                                      value="admin" 
                                      defaultChecked={member.role === 'admin'}
                                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                                    />
                                    <span className="ml-2 text-sm">Admin</span>
                                  </label>
                                </div>
                                <button 
                                  type="submit" 
                                  className="w-full mt-3 btn text-xs py-1"
                                >
                                  Update
                                </button>
                              </form>
                            </div>
                          </details>
                          
                          <form action={removeMember} className="inline">
                            <input type="hidden" name="memberId" value={member.id} />
                            <button 
                              type="submit"
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              onClick={(e) => {
                                if (!confirm(`Remove ${member.user.name || member.user.email} from the team?`)) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add Team Member</h2>
          
          <form action={addTeamMember} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input 
                id="email"
                name="email" 
                type="email"
                placeholder="team@example.com"
                required 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                User must already have an account on the platform
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Role
              </label>
              <div className="space-y-3">
                <label className="flex items-start">
                  <input 
                    type="radio" 
                    name="role" 
                    value="member" 
                    defaultChecked
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Member</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Can edit campaign content and manage milestones
                    </p>
                  </div>
                </label>
                <label className="flex items-start">
                  <input 
                    type="radio" 
                    name="role" 
                    value="admin" 
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Admin</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Can manage team members and all campaign settings
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" className="w-full btn">
              Add Team Member
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Team Permissions</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Owner:</strong> Full control over campaign and team</li>
              <li>• <strong>Admin:</strong> Can manage team and edit all campaign settings</li>
              <li>• <strong>Member:</strong> Can edit campaign content and manage milestones</li>
              <li>• Team members get special badges on comments</li>
            </ul>
          </div>
        </div>
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