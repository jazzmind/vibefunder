import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EditModalButton, CloseModalButton } from "@/components/admin/ModalButtons";

interface OrganizationTeamPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationTeamPage({ params }: OrganizationTeamPageProps) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/signin');
  }

  // Get organization with permissions check
  const organization = await prisma.organization.findFirst({
    where: { 
      id,
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
      teamMembers: {
        include: { user: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!organization) {
    notFound();
  }

  const isOwner = organization.ownerId === session.user.id;
  const userMembership = organization.teamMembers.find(m => m.userId === session.user.id);
  const canManage = isOwner || userMembership?.role === 'admin';

  async function addTeamMember(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const title = formData.get("title") as string;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      redirect(`/organizations/${id}/team?error=user-not-found`);
      return;
    }

    // Check if user is already a team member
    const existingMember = await prisma.organizationTeamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      redirect(`/organizations/${id}/team?error=already-member`);
      return;
    }

    await prisma.organizationTeamMember.create({
      data: {
        organizationId: id,
        userId: user.id,
        role,
        title: title || null
      }
    });

    redirect(`/organizations/${id}/team?success=member-added`);
  }

  async function updateMemberRole(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const memberId = formData.get("memberId") as string;
    const role = formData.get("role") as string;
    const title = formData.get("title") as string;
    const bio = formData.get("bio") as string;
    const linkedinUrl = formData.get("linkedinUrl") as string;
    const githubUrl = formData.get("githubUrl") as string;
    const portfolioUrl = formData.get("portfolioUrl") as string;
    const isPubliclyVisible = formData.get("isPubliclyVisible") === 'on';

    await prisma.organizationTeamMember.update({
      where: { id: memberId },
      data: { 
        role,
        title: title || null,
        bio: bio || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        isPubliclyVisible
      }
    });

    redirect(`/organizations/${id}/team?success=member-updated`);
  }

  async function removeMember(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const memberId = formData.get("memberId") as string;

    await prisma.organizationTeamMember.delete({
      where: { id: memberId }
    });

    redirect(`/organizations/${id}/team?success=member-removed`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href={`/organizations/${id}/settings`}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Team Management</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your organization's team members and their roles</p>
            </div>
            {canManage && (
              <Link href={`/organizations/${id}/team/invite`} className="btn">
                Invite Team Member
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Members List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Team Members ({organization.teamMembers.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Owner */}
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-brand">
                        {(organization.owner.name || organization.owner.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {organization.owner.name || organization.owner.email}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {organization.owner.email}
                          </p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-2">
                            Owner
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                {organization.teamMembers.map((member) => (
                  <div key={member.id} className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                        {member.headshot ? (
                          <img 
                            src={member.headshot} 
                            alt={member.user.name || member.user.email}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {member.user.name || member.user.email}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {member.user.email}
                            </p>
                            {member.title && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {member.title}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                              {!member.isPubliclyVisible && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                  Private
                                </span>
                              )}
                            </div>
                            {member.bio && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                {member.bio}
                              </p>
                            )}
                            {(member.linkedinUrl || member.githubUrl || member.portfolioUrl) && (
                              <div className="flex items-center space-x-3 mt-2">
                                {member.linkedinUrl && (
                                  <a 
                                    href={member.linkedinUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                                {member.githubUrl && (
                                  <a 
                                    href={member.githubUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-700 text-sm"
                                  >
                                    GitHub
                                  </a>
                                )}
                                {member.portfolioUrl && (
                                  <a 
                                    href={member.portfolioUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-brand hover:text-brand-dark text-sm"
                                  >
                                    Portfolio
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          {canManage && (
                            <div className="flex space-x-2">
                              <EditModalButton targetModalId={`edit-member-${member.id}`} />
                              {member.userId !== session.user.id && (
                                <form action={removeMember} className="inline">
                                  <input type="hidden" name="memberId" value={member.id} />
                                  <ConfirmButton
                                    confirmMessage="Are you sure you want to remove this team member?"
                                    className="btn-danger text-sm px-3 py-1"
                                  >
                                    Remove
                                  </ConfirmButton>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit Member Modal */}
                    {canManage && (
                      <dialog id={`edit-member-${member.id}`} className="modal">
                        <div className="modal-box">
                          <h3 className="font-bold text-lg mb-4">Edit Team Member</h3>
                          <form action={updateMemberRole} className="space-y-4">
                            <input type="hidden" name="memberId" value={member.id} />
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Role</label>
                              <select name="role" defaultValue={member.role} className="w-full input input-bordered">
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="lead">Lead</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Job Title</label>
                              <input 
                                type="text" 
                                name="title" 
                                defaultValue={member.title || ''}
                                placeholder="e.g., Senior Developer"
                                className="w-full input input-bordered"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Bio</label>
                              <textarea 
                                name="bio" 
                                defaultValue={member.bio || ''}
                                placeholder="Professional bio"
                                rows={3}
                                className="w-full textarea textarea-bordered"
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                                <input 
                                  type="url" 
                                  name="linkedinUrl" 
                                  defaultValue={member.linkedinUrl || ''}
                                  placeholder="https://linkedin.com/in/username"
                                  className="w-full input input-bordered"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">GitHub URL</label>
                                <input 
                                  type="url" 
                                  name="githubUrl" 
                                  defaultValue={member.githubUrl || ''}
                                  placeholder="https://github.com/username"
                                  className="w-full input input-bordered"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Portfolio URL</label>
                                <input 
                                  type="url" 
                                  name="portfolioUrl" 
                                  defaultValue={member.portfolioUrl || ''}
                                  placeholder="https://yourportfolio.com"
                                  className="w-full input input-bordered"
                                />
                              </div>
                            </div>

                            <div className="form-control">
                              <label className="label cursor-pointer">
                                <span className="label-text">Publicly visible on organization profile</span>
                                <input 
                                  type="checkbox" 
                                  name="isPubliclyVisible" 
                                  defaultChecked={member.isPubliclyVisible}
                                  className="checkbox" 
                                />
                              </label>
                            </div>

                            <div className="modal-action">
                              <button type="submit" className="btn btn-primary">Save Changes</button>
                              <CloseModalButton targetModalId={`edit-member-${member.id}`} />
                            </div>
                          </form>
                        </div>
                      </dialog>
                    )}
                  </div>
                ))}

                {organization.teamMembers.length === 0 && (
                  <div className="p-12 text-center">
                    <span className="text-4xl mb-4 block">👥</span>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Team Members Yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Invite team members to collaborate on your organization.
                    </p>
                    {canManage && (
                      <Link href={`/organizations/${id}/team/invite`} className="btn">
                        Invite Your First Team Member
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {canManage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Team Member</h3>
                <form action={addTeamMember} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input 
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="team@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      User must have a VibeFunder account
                    </p>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role *
                    </label>
                    <select 
                      id="role"
                      name="role"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="lead">Lead</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Job Title (Optional)
                    </label>
                    <input 
                      id="title"
                      name="title"
                      type="text"
                      placeholder="e.g., Senior Developer"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button type="submit" className="w-full btn">
                    Add Team Member
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Role Permissions</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-purple-600 dark:text-purple-400">Owner</h4>
                  <p className="text-gray-600 dark:text-gray-400">Full control over organization settings, team, and can delete the organization.</p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">Admin</h4>
                  <p className="text-gray-600 dark:text-gray-400">Can manage organization settings, team members, services, and campaigns.</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400">Lead</h4>
                  <p className="text-gray-600 dark:text-gray-400">Can manage specific projects and campaigns. Limited organization settings access.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-600 dark:text-gray-400">Member</h4>
                  <p className="text-gray-600 dark:text-gray-400">Basic team member with view access and ability to contribute to campaigns.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
