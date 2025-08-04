import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ConfirmButton } from "@/app/components/ConfirmButton";

export default async function AdminUsers({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string }> 
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session || !session.roles.includes('admin')) {
    redirect('/signin');
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      campaigns: { select: { id: true, title: true, status: true } },
      pledges: { select: { id: true, amountDollars: true } },
      _count: {
        select: {
          campaigns: true,
          pledges: true,
          comments: true
        }
      }
    }
  });

  async function updateUserRoles(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session || !session.roles.includes('admin')) {
      redirect('/signin');
    }

    const userId = formData.get("userId") as string;
    const roles = formData.getAll("roles") as string[];

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { roles }
      });
      redirect('/admin/users?success=roles-updated');
    } catch (error) {
      console.error('Error updating user roles:', error);
      redirect('/admin/users?error=roles-update-failed');
    }
  }

  async function deleteUser(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session || !session.roles.includes('admin')) {
      redirect('/signin');
    }

    const userId = formData.get("userId") as string;
    
    // Prevent admin from deleting themselves
    if (userId === session.userId) {
      redirect('/admin/users?error=cannot-delete-self');
    }

    try {
      await prisma.user.delete({
        where: { id: userId }
      });
      redirect('/admin/users?success=user-deleted');
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Check for foreign key constraint errors
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        if (error.message.includes('campaigns')) {
          redirect('/admin/users?error=user-has-campaigns');
        } else if (error.message.includes('pledges')) {
          redirect('/admin/users?error=user-has-pledges');
        } else if (error.message.includes('comments')) {
          redirect('/admin/users?error=user-has-comments');
        } else {
          redirect('/admin/users?error=user-has-dependencies');
        }
      } else {
        redirect('/admin/users?error=delete-failed');
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">User Management</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage platform users, roles, and permissions</p>
          </div>
          <Link href="/admin" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        {/* Error/Success Messages */}
        {params.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">
              {params.error === 'cannot-delete-self' && 'You cannot delete your own account.'}
              {params.error === 'user-has-campaigns' && 'Cannot delete user: User has active campaigns. Delete or transfer campaigns first.'}
              {params.error === 'user-has-pledges' && 'Cannot delete user: User has pledges. Contact support for assistance.'}
              {params.error === 'user-has-comments' && 'Cannot delete user: User has comments. Consider anonymizing instead.'}
              {params.error === 'user-has-dependencies' && 'Cannot delete user: User has dependencies that must be resolved first.'}
              {params.error === 'delete-failed' && 'Failed to delete user. Please try again.'}
              {params.error === 'roles-update-failed' && 'Failed to update user roles. Please try again.'}
              {!['cannot-delete-self', 'user-has-campaigns', 'user-has-pledges', 'user-has-comments', 'user-has-dependencies', 'delete-failed', 'roles-update-failed'].includes(params.error) && 'An error occurred.'}
            </p>
          </div>
        )}
        
        {params.success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300">
              {params.success === 'user-deleted' && 'User deleted successfully.'}
              {params.success === 'roles-updated' && 'User roles updated successfully.'}
            </p>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Users ({users.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-semibold">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name || user.email.split('@')[0]}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <span 
                            key={role} 
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              role === 'admin' 
                                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="space-y-1">
                        <div>{user._count.campaigns} campaigns</div>
                        <div>{user._count.pledges} pledges</div>
                        <div>{user._count.comments} comments</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <details className="relative">
                          <summary className="cursor-pointer text-brand hover:text-brand-dark">
                            Edit Roles
                          </summary>
                          <div className="absolute top-6 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 w-48">
                            <form action={updateUserRoles}>
                              <input type="hidden" name="userId" value={user.id} />
                              <div className="space-y-2">
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    name="roles" 
                                    value="user" 
                                    defaultChecked={user.roles.includes('user')}
                                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" 
                                  />
                                  <span className="ml-2 text-sm">User</span>
                                </label>
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    name="roles" 
                                    value="admin" 
                                    defaultChecked={user.roles.includes('admin')}
                                    disabled={user.id === session.userId}
                                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded disabled:opacity-50" 
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
                        
                        {user.id !== session.userId && (
                          <form action={deleteUser} className="inline">
                            <input type="hidden" name="userId" value={user.id} />
                            <ConfirmButton
                              confirmMessage={`Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </ConfirmButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}