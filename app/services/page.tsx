import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function ServiceMarketplacePage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  
  // Get service categories with provider counts
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    include: {
      services: {
        where: {
          isActive: true,
          organization: {
            status: 'approved',
            type: 'service_provider',
            // Filter by visibility based on authentication
            listingVisibility: isAuthenticated 
              ? { in: ['public', 'creators_only', 'limited'] }
              : { in: ['public', 'limited'] }
          }
        },
        include: {
          organization: {
            include: {
              teamMembers: {
                where: { isPubliclyVisible: true },
                take: 3,
                orderBy: { order: 'asc' },
                include: { user: true }
              }
            }
          }
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  // Get featured service providers
  const featuredProviders = await prisma.organization.findMany({
    where: {
      type: 'service_provider',
      status: 'approved',
      listingVisibility: isAuthenticated 
        ? { in: ['public', 'creators_only', 'limited'] }
        : { in: ['public', 'limited'] },
      services: {
        some: { isFeatured: true, isActive: true }
      }
    },
    include: {
      services: {
        where: { isFeatured: true, isActive: true },
        take: 1,
        include: { category: true }
      },
      teamMembers: {
        where: { isPubliclyVisible: true },
        take: 3,
        orderBy: { order: 'asc' },
        include: { user: true }
      }
    },
    take: 6
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Service Provider Marketplace
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Connect with expert service providers who specialize in helping AI-native software projects succeed.
              From cybersecurity to DevOps, find the professional services you need.
            </p>
            {!isAuthenticated && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Link href="/signin" className="font-medium hover:underline">Sign in</Link> to see all available services and provider details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Providers */}
        {featuredProviders.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Featured Service Providers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProviders.map((provider) => (
                <Link key={provider.id} href={`/services/providers/${provider.id}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {provider.logo ? (
                          <img 
                            src={provider.logo} 
                            alt={provider.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🏢</span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{provider.name}</h3>
                          {provider.shortDescription && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{provider.shortDescription}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {provider.services[0] && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand">
                          {provider.services[0].category.icon} {provider.services[0].category.name}
                        </span>
                      </div>
                    )}
                    
                    {provider.teamMembers.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-2">
                          {provider.teamMembers.map((member) => (
                            <div key={member.id} className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 overflow-hidden">
                              {member.headshot ? (
                                <img 
                                  src={member.headshot} 
                                  alt={member.user.name || member.user.email}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                                  {(member.user.name || member.user.email)[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {provider.teamMembers.length} team member{provider.teamMembers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Service Categories */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Browse by Service Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/services/categories/${category.slug}`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.services.length} provider{category.services.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{category.description}</p>
                  )}
                  
                  {/* Preview of providers in this category */}
                  {category.services.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="space-y-2">
                        {category.services.slice(0, 2).map((service) => (
                          <div key={service.id} className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {service.organization.name}
                            </span>
                            {service.title && (
                              <span className="text-gray-600 dark:text-gray-400"> - {service.title}</span>
                            )}
                          </div>
                        ))}
                        {category.services.length > 2 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            +{category.services.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Call to Action for Service Providers */}
        <section className="mt-16 bg-gradient-to-r from-brand/10 to-brand/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Are you a service provider?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Join our marketplace and connect with innovative AI-native software projects that need your expertise.
            Showcase your services, build your reputation, and grow your business.
          </p>
          <div className="space-x-4">
            <Link href="/waitlist" className="btn">
              Join the Waitlist
            </Link>
            <Link href="/organizations/new" className="btn-secondary">
              Apply as Service Provider
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}