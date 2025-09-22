import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

interface ServiceCategoriesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceCategoriesPage({ params }: ServiceCategoriesPageProps) {
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
            some: { 
              userId: session.user.id,
              role: { in: ['admin'] }
            }
          }
        }
      ]
    },
    include: {
      services: {
        select: { categoryId: true }
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

  if (!canManage) {
    redirect(`/organizations/${id}/services`);
  }

  // Check if organization is approved to add services
  if (organization.status !== 'approved') {
    redirect(`/organizations/${id}/services`);
  }

  // Get all active service categories
  const allCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [
      { order: 'asc' },
      { name: 'asc' }
    ]
  });

  // Get categories that the organization already offers
  const usedCategoryIds = organization.services.map(s => s.categoryId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href={`/organizations/${id}/services`}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Services
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Add Service</h1>
          <p className="text-gray-600 dark:text-gray-300">Choose a service category to add to your organization</p>
        </div>

        {/* Service Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allCategories.map(category => {
            const isUsed = usedCategoryIds.includes(category.id);
            
            return (
              <div 
                key={category.id} 
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border transition-all ${
                  isUsed 
                    ? 'border-gray-200 dark:border-gray-700 opacity-50' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand dark:hover:border-brand hover:shadow-md'
                }`}
              >
                {/* Category Info */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-4xl">{category.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex justify-end">
                  {isUsed ? (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Already added
                    </div>
                  ) : (
                    <Link 
                      href={`/organizations/${id}/services/new?category=${category.id}`}
                      className="flex items-center justify-center w-10 h-10 bg-brand text-white rounded-full hover:bg-brand-dark transition-colors"
                      title={`Add ${category.name} service`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Used overlay */}
                {isUsed && (
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto h-full w-full z-50 rounded-2xl flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Service already added
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {allCategories.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🏗️</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Service Categories Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              There are no active service categories at the moment. Please contact an administrator.
            </p>
          </div>
        )}

        {/* All Categories Used */}
        {allCategories.length > 0 && usedCategoryIds.length === allCategories.length && (
          <div className="text-center py-12 mt-8">
            <span className="text-4xl mb-4 block">🎉</span>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All Categories Added!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your organization offers services in all available categories.
            </p>
            <Link href={`/organizations/${id}/services`} className="btn">
              Manage Existing Services
            </Link>
          </div>
        )}

        {/* Summary */}
        {allCategories.length > 0 && usedCategoryIds.length < allCategories.length && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Service Categories</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You have added services in {usedCategoryIds.length} out of {allCategories.length} available categories. 
                  Click the + button on any category to add a new service.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note about creating categories */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Need a new category?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Service categories are managed by administrators. If you need a category that's not listed here, 
                please contact support to request a new category.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
