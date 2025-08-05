import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface ServiceCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceCategoryPage({ params }: ServiceCategoryPageProps) {
  const { slug } = await params;
  const session = await auth();
  const isAuthenticated = !!session?.user;
  
  // Get the service category with providers
  const category = await prisma.serviceCategory.findUnique({
    where: { 
      slug,
      isActive: true
    },
    include: {
      services: {
        where: {
          isActive: true,
          organization: {
            status: 'approved',
            type: 'service_provider',
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
        },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' }
        ]
      }
    }
  });

  if (!category) {
    notFound();
  }

  // Group services by organization
  const providerServices = category.services.reduce((acc, service) => {
    const orgId = service.organization.id;
    if (!acc[orgId]) {
      acc[orgId] = {
        organization: service.organization,
        services: []
      };
    }
    acc[orgId].services.push(service);
    return acc;
  }, {} as Record<string, { organization: any; services: any[] }>);

  const providers = Object.values(providerServices);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href="/services" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Services
            </Link>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-5xl">{category.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {category.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {providers.length} service provider{providers.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          
          {category.description && (
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
              {category.description}
            </p>
          )}
          
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Link href="/signin" className="font-medium hover:underline">Sign in</Link> to see detailed provider information and contact details.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {providers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-3xl">{category.icon}</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              No providers yet
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We don't have any service providers in this category yet, but we're actively recruiting.
            </p>
            <Link href="/waitlist" className="btn">
              Join Waitlist to Get Notified
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {providers.map(({ organization, services }) => {
              const isLimitedView = !isAuthenticated && organization.listingVisibility === 'limited';
              
              return (
                <div key={organization.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    {organization.logo ? (
                      <img 
                        src={organization.logo} 
                        alt={organization.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-brand/10 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🏢</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {organization.name}
                      </h3>
                      {organization.shortDescription && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {organization.shortDescription}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        {organization.website && (
                          <a 
                            href={organization.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-brand flex items-center space-x-1"
                          >
                            <span>🌐</span>
                            <span>Website</span>
                          </a>
                        )}
                        <span className="flex items-center space-x-1">
                          <span>👥</span>
                          <span>{organization.teamMembers.length} team member{organization.teamMembers.length !== 1 ? 's' : ''}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-4 mb-6">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {service.title || category.name}
                          </h4>
                          {service.isFeatured && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Featured
                            </span>
                          )}
                        </div>
                        
                        {service.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                            {service.description}
                          </p>
                        )}
                        
                        {!isLimitedView && service.estimatedTime && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">Timeline: </span>
                            <span className="text-gray-600 dark:text-gray-400">{service.estimatedTime}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Team Preview */}
                  {organization.teamMembers.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Team</h4>
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          {organization.teamMembers.map((member: any) => (
                            <div key={member.id} className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 overflow-hidden">
                              {member.headshot ? (
                                <img 
                                  src={member.headshot} 
                                  alt={member.user.name || member.user.email}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                                  {(member.user.name || member.user.email)[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {organization.teamMembers.slice(0, 2).map((member: any) => 
                            member.user.name || member.user.email.split('@')[0]
                          ).join(', ')}
                          {organization.teamMembers.length > 2 && ` +${organization.teamMembers.length - 2} more`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <Link 
                      href={`/services/providers/${organization.id}`}
                      className="btn flex-1 text-center"
                    >
                      View Profile
                    </Link>
                    {!isLimitedView && organization.email && (
                      <a 
                        href={`mailto:${organization.email}`}
                        className="btn-secondary flex-1 text-center"
                      >
                        Contact
                      </a>
                    )}
                  </div>
                  
                  {isLimitedView && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <Link href="/signin" className="font-medium hover:underline">Sign in</Link> to see contact information and full service details.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-brand/10 to-brand/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Offer {category.name} Services?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Join our marketplace and connect with AI-native software projects that need your {category.name.toLowerCase()} expertise.
          </p>
          <div className="space-x-4">
            <Link href="/waitlist" className="btn">
              Join the Waitlist
            </Link>
            <Link href="/organizations/new" className="btn-secondary">
              Apply as Service Provider
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}