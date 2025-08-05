import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface ServiceProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceProviderPage({ params }: ServiceProviderPageProps) {
  const { id } = await params;
  const session = await auth();
  const isAuthenticated = !!session?.user;
  
  // Get the service provider organization
  const provider = await prisma.organization.findUnique({
    where: { 
      id,
      type: 'service_provider',
      status: 'approved'
    },
    include: {
      owner: true,
      services: {
        where: { isActive: true },
        include: { category: true },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' }
        ]
      },
      teamMembers: {
        where: { isPubliclyVisible: true },
        include: { user: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!provider) {
    notFound();
  }

  // Check visibility permissions
  if (!isAuthenticated && provider.listingVisibility === 'creators_only') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This service provider profile is only available to registered creators.
          </p>
          <Link href="/signin" className="btn">
            Sign In to View
          </Link>
        </div>
      </div>
    );
  }

  const isLimitedView = !isAuthenticated && provider.listingVisibility === 'limited';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start space-x-6">
            {provider.logo ? (
              <img 
                src={provider.logo} 
                alt={provider.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-brand/10 rounded-lg flex items-center justify-center">
                <span className="text-4xl">🏢</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {provider.name}
              </h1>
              {provider.shortDescription && (
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
                  {provider.shortDescription}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                {provider.website && (
                  <a 
                    href={provider.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-brand flex items-center space-x-1"
                  >
                    <span>🌐</span>
                    <span>Website</span>
                  </a>
                )}
                {!isLimitedView && provider.email && (
                  <a 
                    href={`mailto:${provider.email}`}
                    className="hover:text-brand flex items-center space-x-1"
                  >
                    <span>✉️</span>
                    <span>Contact</span>
                  </a>
                )}
                <span className="flex items-center space-x-1">
                  <span>👥</span>
                  <span>{provider.teamMembers.length} team member{provider.teamMembers.length !== 1 ? 's' : ''}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {provider.description && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  About {provider.name}
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {provider.description}
                  </p>
                </div>
              </section>
            )}

            {/* Services */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Services Offered
              </h2>
              <div className="space-y-6">
                {provider.services.map((service) => (
                  <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.category.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {service.title || service.category.name}
                          </h3>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {service.category.name}
                          </span>
                        </div>
                      </div>
                      {service.isFeatured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {service.description}
                      </p>
                    )}
                    
                    {!isLimitedView && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {service.deliverables && Array.isArray(JSON.parse(service.deliverables as string)) && (
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Deliverables:</h4>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                              {(JSON.parse(service.deliverables as string) as string[]).map((item, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span>•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {service.estimatedTime && (
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline:</h4>
                            <p className="text-gray-600 dark:text-gray-400">{service.estimatedTime}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isLimitedView && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <Link href="/signin" className="font-medium hover:underline">Sign in</Link> to see detailed service information, pricing, and deliverables.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Portfolio */}
            {!isLimitedView && provider.portfolioItems && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Portfolio & Case Studies
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(JSON.parse(provider.portfolioItems as string) as any[]).map((item, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{item.description}</p>
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand hover:text-brand-dark text-sm font-medium mt-2 inline-block"
                        >
                          View Project →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            {provider.teamMembers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Team
                </h3>
                <div className="space-y-4">
                  {provider.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-start space-x-3">
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
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {member.user.name || member.user.email}
                        </h4>
                        {member.title && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{member.title}</p>
                        )}
                        {!isLimitedView && member.bio && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{member.bio}</p>
                        )}
                        {!isLimitedView && (member.linkedinUrl || member.githubUrl || member.portfolioUrl) && (
                          <div className="flex items-center space-x-2 mt-2">
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            {!isLimitedView && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Get in Touch
                </h3>
                <div className="space-y-3">
                  {provider.email && (
                    <a 
                      href={`mailto:${provider.email}`}
                      className="btn w-full text-center"
                    >
                      Contact {provider.name}
                    </a>
                  )}
                  {provider.website && (
                    <a 
                      href={provider.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary w-full text-center"
                    >
                      Visit Website
                    </a>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Interested in working together? Reach out directly to discuss your project needs.
                </div>
              </div>
            )}

            {isLimitedView && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Want to Connect?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Sign in to see full team details, contact information, and portfolio examples.
                </p>
                <Link href="/signin" className="btn w-full text-center">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}