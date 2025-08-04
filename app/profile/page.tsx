import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function PersonalProfile() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      org: true, 
      roles: true, 
      createdAt: true,
      pledges: {
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
              fundingGoalDollars: true,
              raisedDollars: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) {
    redirect('/signin');
  }

  async function updateProfile(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const name = formData.get("name") as string;
    
    await prisma.user.update({
      where: { id: session.userId },
      data: { name: name || null }
    });

    redirect('/profile');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Personal Profile</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your personal information and account settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {user.name || user.email.split('@')[0]}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{user.email}</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {user.roles.map(role => (
                  <span key={role} className="px-2 py-1 text-xs bg-brand/10 text-brand rounded-full">
                    {role}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Member since {user.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form action={updateProfile} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input 
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input 
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user.name || ''}
                    placeholder="Enter your display name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn">
                Save Changes
              </button>
            </div>
          </form>

          {/* Pledge Management for Backers */}
          {user.pledges && user.pledges.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Your Pledges</h3>
              <div className="space-y-4">
                {user.pledges.map((pledge) => {
                  const fundingProgress = pledge.campaign.fundingGoalDollars > 0 
                    ? (pledge.campaign.raisedDollars / pledge.campaign.fundingGoalDollars) * 100 
                    : 0;
                  
                  return (
                    <div key={pledge.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            <Link 
                              href={`/campaigns/${pledge.campaign.id}`}
                              className="hover:text-brand transition-colors"
                            >
                              {pledge.campaign.title}
                            </Link>
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>Pledged: <strong className="text-gray-900 dark:text-white">${pledge.amountDollars.toLocaleString()}</strong></span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              pledge.status === 'captured' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : pledge.status === 'authorized'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {pledge.status === 'captured' ? 'Funded' : 
                               pledge.status === 'authorized' ? 'Pending' : 
                               pledge.status.charAt(0).toUpperCase() + pledge.status.slice(1)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              pledge.campaign.status === 'live' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : pledge.campaign.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              Campaign: {pledge.campaign.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Pledged {new Date(pledge.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Funding Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>Campaign Progress</span>
                          <span>{Math.round(fundingProgress)}% funded</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-brand h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>${pledge.campaign.raisedDollars.toLocaleString()} raised</span>
                          <span>Goal: ${pledge.campaign.fundingGoalDollars.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link 
                          href={`/campaigns/${pledge.campaign.id}`}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          View Campaign
                        </Link>
                        <Link 
                          href={`/campaigns/${pledge.campaign.id}/updates`}
                          className="btn-secondary text-sm px-3 py-1"
                        >
                          Updates
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Total Pledged</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Across all campaigns</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand">
                      ${user.pledges.reduce((sum, pledge) => sum + pledge.amountDollars, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.pledges.length} campaign{user.pledges.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Security Settings</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Manage your passkeys and authentication methods for secure sign-in.
                </p>
                <a href="/profile/passkeys" className="btn-secondary">
                  Manage Security
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}