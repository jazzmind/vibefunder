import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export default async function BusinessProfile() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, org: true, roles: true }
  });

  if (!user) {
    redirect('/signin');
  }

  async function updateBusinessProfile(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const org = formData.get("org") as string;
    
    await prisma.user.update({
      where: { id: session.userId },
      data: { org: org || null }
    });

    redirect('/profile/business');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Business Profile</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your business information and organization settings</p>
      </div>

      <form action={updateBusinessProfile} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Organization Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="org" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Name
              </label>
              <input 
                id="org"
                name="org"
                type="text"
                defaultValue={user.org || ''}
                placeholder="Enter your organization name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be displayed on your campaigns
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Type
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.roles.includes('maker') ? 'Maker Account' : 'Backer Account'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {user.roles.includes('maker') 
                    ? 'You can create and manage campaigns' 
                    : 'You can back campaigns and support makers'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Business Features</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Campaign Creation</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Create and manage campaigns to raise funding for your projects
              </p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.roles.includes('maker') 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                {user.roles.includes('maker') ? 'Enabled' : 'Not Available'}
              </span>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Funding Support</h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Support innovative projects by backing campaigns
              </p>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Always Enabled
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <a href="/profile" className="btn-secondary">
            Back to Personal Profile
          </a>
          <button type="submit" className="btn">
            Save Business Info
          </button>
        </div>
      </form>
    </div>
  );
}