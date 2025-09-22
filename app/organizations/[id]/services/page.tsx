import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";

interface OrganizationServicesPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationServicesPage({ params }: OrganizationServicesPageProps) {
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
      services: {
        include: { category: true },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' }
        ]
      },
      teamMembers: {
        select: {
          userId: true,
          role: true
        }
      }
    }
  });

  if (!organization) {
    notFound();
  }

  const isOwner = organization.ownerId === session.user.id;
  const userMembership = organization.teamMembers?.find(m => m.userId === session.user.id);
  const canManage = isOwner || userMembership?.role === 'admin';

  // Get available service categories
  const availableCategories = await prisma.serviceCategory.findMany({
    where: { 
      isActive: true,
      NOT: {
        id: { in: organization.services.map(s => s.categoryId) }
      }
    },
    orderBy: { order: 'asc' }
  });

  async function toggleServiceStatus(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const serviceId = formData.get("serviceId") as string;
    const isActive = formData.get("isActive") === 'true';

    await prisma.organizationService.update({
      where: { id: serviceId },
      data: { isActive: !isActive }
    });

    redirect(`/organizations/${id}/services`);
  }

  async function toggleFeaturedStatus(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const serviceId = formData.get("serviceId") as string;
    const isFeatured = formData.get("isFeatured") === 'true';

    await prisma.organizationService.update({
      where: { id: serviceId },
      data: { isFeatured: !isFeatured }
    });

    redirect(`/organizations/${id}/services`);
  }

  async function deleteService(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const serviceId = formData.get("serviceId") as string;

    await prisma.organizationService.delete({
      where: { id: serviceId }
    });

    redirect(`/organizations/${id}/services?success=service-deleted`);
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Services Management</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your organization's service offerings</p>
            </div>
            {canManage && organization.status === 'approved' && availableCategories.length > 0 && (
              <Link href={`/organizations/${id}/services/new`} className="btn">
                Add Service
              </Link>
            )}
          </div>
        </div>

        {/* Organization Status Alert */}
        {organization.status !== 'approved' && (
          <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                  {organization.status === 'pending' ? 'Approval Pending' : 'Not Approved'}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {organization.status === 'pending' 
                    ? 'Your organization is pending approval to offer services. You can prepare services but they will not be publicly visible until approved.'
                    : 'Your organization needs to be approved before you can offer services.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Current Services ({organization.services.length})
                </h2>
              </div>
              
              {organization.services.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {organization.services.map((service) => (
                    <div key={service.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <span className="text-3xl">{service.category.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {service.title || service.category.name}
                              </h3>
                              <div className="flex space-x-2">
                                {service.isFeatured && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    Featured
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  service.isActive 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {service.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Category: {service.category.name}
                            </p>
                            {service.description && (
                              <p className="text-gray-700 dark:text-gray-300 mb-3">
                                {service.description}
                              </p>
                            )}
                            {service.estimatedTime && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Timeline:</strong> {service.estimatedTime}
                              </p>
                            )}
                            {service.deliverables && (
                              <div className="mt-3">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Deliverables:</h4>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                  {Array.isArray(service.deliverables) ? (
                                    (service.deliverables as string[]).map((item, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span>•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))
                                  ) : typeof service.deliverables === 'string' ? (
                                    JSON.parse(service.deliverables).map((item: string, index: number) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span>•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))
                                  ) : null}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {canManage && (
                          <div className="flex flex-col space-y-2 ml-4">
                            <Link 
                              href={`/organizations/${id}/services/${service.id}/edit`}
                              className="btn-secondary text-sm px-3 py-1 text-center"
                            >
                              Edit
                            </Link>
                            <form action={toggleServiceStatus} className="inline">
                              <input type="hidden" name="serviceId" value={service.id} />
                              <input type="hidden" name="isActive" value={service.isActive.toString()} />
                              <button 
                                type="submit"
                                className={`btn text-sm px-3 py-1 w-full ${
                                  service.isActive 
                                    ? 'bg-gray-600 hover:bg-gray-700' 
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {service.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </form>
                            <form action={toggleFeaturedStatus} className="inline">
                              <input type="hidden" name="serviceId" value={service.id} />
                              <input type="hidden" name="isFeatured" value={service.isFeatured.toString()} />
                              <button 
                                type="submit"
                                className={`btn-secondary text-sm px-3 py-1 w-full ${
                                  service.isFeatured ? 'bg-yellow-100 text-yellow-800' : ''
                                }`}
                              >
                                {service.isFeatured ? 'Unfeature' : 'Feature'}
                              </button>
                            </form>
                            <form action={deleteService} className="inline">
                              <input type="hidden" name="serviceId" value={service.id} />
                              <ConfirmButton
                                confirmMessage="Are you sure you want to delete this service? This action cannot be undone."
                                className="btn-danger text-sm px-3 py-1 w-full"
                              >
                                Delete
                              </ConfirmButton>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Services Yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {organization.status !== 'approved' 
                      ? 'Organization approval required to add services.'
                      : 'Add services to showcase your capabilities to potential clients.'}
                  </p>
                  {canManage && organization.status === 'approved' && availableCategories.length > 0 && (
                    <Link href={`/organizations/${id}/services/new`} className="btn">
                      Add Your First Service
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Available Categories */}
            {canManage && organization.status === 'approved' && availableCategories.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Categories</h3>
                <div className="space-y-3">
                  {availableCategories.slice(0, 5).map(category => (
                    <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{category.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">{category.name}</h4>
                          {category.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <Link 
                        href={`/organizations/${id}/services/new?category=${category.id}`}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        Add
                      </Link>
                    </div>
                  ))}
                  <Link href={`/organizations/${id}/services/categories`} className="text-brand hover:text-brand-dark text-sm font-medium">
                    {availableCategories.length > 5 
                      ? `View all ${availableCategories.length} categories →`
                      : 'View all categories →'
                    }
                  </Link>
                </div>
              </div>
            )}

            {/* Service Provider Application */}
            {organization.type !== 'service_provider' && canManage && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Apply as Service Provider
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  To offer services, your organization needs to be approved as a service provider.
                </p>
                <Link href={`/organizations/${id}/apply-service-provider`} className="btn w-full text-center">
                  Apply Now
                </Link>
              </div>
            )}

            {/* Service Guidelines */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Guidelines</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Provide clear, detailed service descriptions</p>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Include realistic timelines and deliverables</p>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Use the "Featured" status for your top services</p>
                </div>
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p>Keep inactive services for future reference</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
