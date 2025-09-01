import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ServiceProviderDashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/signin?redirect=/service-providers/dashboard');
  }

  // Get the user's service provider organization
  const organization = await prisma.organization.findFirst({
    where: {
      ownerId: session.user.id,
      type: 'service_provider'
    },
    include: {
      services: {
        include: {
          category: true
        }
      },
      teamMembers: {
        include: {
          user: true
        }
      }
    }
  });

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to VibeFunder
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Start your journey as a service provider on our platform.
          </p>
          <Link href="/service-providers/onboard" className="btn">
            Become a Service Provider
          </Link>
        </div>
      </div>
    );
  }

  // Get basic analytics data
  const totalServices = organization.services.length;
  const activeServices = organization.services.filter(s => s.isActive).length;
  const featuredServices = organization.services.filter(s => s.isFeatured).length;

  // Mock data for analytics (in real implementation, these would come from actual data)
  const mockAnalytics = {
    profileViews: Math.floor(Math.random() * 500) + 100,
    inquiries: Math.floor(Math.random() * 50) + 10,
    projectsCompleted: Math.floor(Math.random() * 25) + 5,
    earnings: Math.floor(Math.random() * 50000) + 10000,
    conversionRate: (Math.random() * 15 + 5).toFixed(1)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Service Provider Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your services and track your performance
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {organization.status === 'pending' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Pending Review
                </span>
              )}
              {organization.status === 'approved' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  ✓ Approved
                </span>
              )}
              <Link href={`/services/providers/${organization.id}`} className="btn-secondary">
                View Public Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Alert */}
        {organization.status === 'pending' && (
          <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Application Under Review
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Your service provider application is being reviewed by our team. You'll receive an email notification once it's approved.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">👁️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profile Views</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{mockAnalytics.profileViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💬</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inquiries</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{mockAnalytics.inquiries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projects Done</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{mockAnalytics.projectsCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">${mockAnalytics.earnings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{mockAnalytics.conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Services Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your Services
                </h2>
                <Link href={`/organizations/${organization.id}/settings`} className="btn-secondary">
                  Manage Services
                </Link>
              </div>

              {organization.services.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">📋</span>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Services Listed Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Start by adding your first service offering to attract clients.
                  </p>
                  <Link href={`/organizations/${organization.id}/settings?tab=services`} className="btn">
                    Add Your First Service
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalServices}</div>
                      <div className="text-gray-600 dark:text-gray-400">Total Services</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{activeServices}</div>
                      <div className="text-gray-600 dark:text-gray-400">Active</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{featuredServices}</div>
                      <div className="text-gray-600 dark:text-gray-400">Featured</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {organization.services.slice(0, 3).map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{service.category.icon}</span>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {service.title || service.category.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {service.category.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {service.isFeatured && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Featured
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            service.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {organization.services.length > 3 && (
                      <div className="text-center">
                        <Link href={`/organizations/${organization.id}/settings?tab=services`} className="text-brand hover:text-brand-dark">
                          View all {organization.services.length} services →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity (Mock) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-xl">👀</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Profile viewed by potential client
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-xl">📧</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Service inquiry received
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Service marked as featured
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">3 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Organization Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                  <p className="text-gray-900 dark:text-white">{organization.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                  <p className="text-gray-900 dark:text-white">{organization.email}</p>
                </div>
                {organization.website && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Website:</span>
                    <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark block">
                      {organization.website}
                    </a>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Team Members:</span>
                  <p className="text-gray-900 dark:text-white">{organization.teamMembers.length}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link href={`/organizations/${organization.id}/settings`} className="btn-secondary w-full">
                  Edit Organization
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link href={`/organizations/${organization.id}/settings?tab=services`} className="block w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">➕</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Add Service</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Create new service offering</div>
                    </div>
                  </div>
                </Link>
                <Link href={`/organizations/${organization.id}/settings?tab=team`} className="block w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">👥</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Manage Team</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Add or edit team members</div>
                    </div>
                  </div>
                </Link>
                <Link href={`/services/providers/${organization.id}`} className="block w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">🔗</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Public Profile</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">View how clients see you</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="bg-gradient-to-r from-brand/10 to-brand/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Performance Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• Complete your profile with portfolio items</li>
                <li>• Add detailed service descriptions</li>
                <li>• Respond quickly to client inquiries</li>
                <li>• Keep your services up to date</li>
                <li>• Showcase recent work and testimonials</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
