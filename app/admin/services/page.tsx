import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminServices({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string; tab?: string }> 
}) {
  const params = await searchParams;
  const session = await auth();
  const activeTab = params.tab || 'providers';
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  // Get service providers
  const serviceProviders = await prisma.organization.findMany({
    where: { type: 'service_provider' },
    include: {
      owner: true,
      services: {
        include: { category: true }
      },
      teamMembers: true,
      _count: {
        select: { services: true, teamMembers: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get service categories
  const serviceCategories = await prisma.serviceCategory.findMany({
    include: {
      services: {
        include: { organization: true }
      },
      _count: {
        select: { services: true }
      }
    },
    orderBy: { order: 'asc' }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Management</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Manage service providers and categories for the marketplace.
        </p>
      </div>

      {params.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{params.error}</p>
        </div>
      )}

      {params.success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{params.success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="/admin/services?tab=providers"
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'providers'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Service Providers ({serviceProviders.length})
          </Link>
          <Link
            href="/admin/services?tab=categories"
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Categories ({serviceCategories.length})
          </Link>
        </nav>
      </div>

      {/* Service Providers Tab */}
      {activeTab === 'providers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Providers
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Visibility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {serviceProviders.map((provider) => (
                    <tr 
                      key={provider.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          <div className="flex items-start space-x-3">
                            {provider.logo ? (
                              <img 
                                src={provider.logo} 
                                alt={provider.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                                <span className="text-brand font-semibold">
                                  {provider.name[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {provider.name}
                              </div>
                              {provider.shortDescription && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {provider.shortDescription}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          <div className="text-sm">
                            <div className="text-gray-900 dark:text-white">
                              {provider.owner.name || provider.owner.email}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {provider.owner.email}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            provider.status === 'approved' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : provider.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {provider.status}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          <div>
                            {provider._count.services} service{provider._count.services !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs">
                            {provider._count.teamMembers} team member{provider._count.teamMembers !== 1 ? 's' : ''}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            provider.listingVisibility === 'public'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : provider.listingVisibility === 'creators_only'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {provider.listingVisibility.replace('_', ' ')}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <Link href={`/admin/services/providers/${provider.id}`} className="block">
                          {new Date(provider.createdAt).toLocaleDateString()}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {serviceProviders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No service providers found</p>
            </div>
          )}
        </div>
      )}

      {/* Service Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Categories
            </h2>
            <Link 
              href="/admin/services/categories/new"
              className="btn"
            >
              Add Category
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((category) => (
              <Link 
                key={category.id} 
                href={`/admin/services/categories/${category.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category._count.services} provider{category._count.services !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      {category.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full ${
                      category.isActive 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Order: {category.order}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {serviceCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No service categories found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}