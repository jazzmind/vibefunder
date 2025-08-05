import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfirmButton } from "@/app/components/ConfirmButton";

interface AdminServiceCategoryDetailProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AdminServiceCategoryDetail({ 
  params, 
  searchParams 
}: AdminServiceCategoryDetailProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  const category = await prisma.serviceCategory.findUnique({
    where: { id },
    include: {
      services: {
        include: { 
          organization: {
            include: { owner: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!category) {
    notFound();
  }

  async function updateCategory(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const categoryId = formData.get("categoryId") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const order = parseInt(formData.get("order") as string);
    const isActive = formData.get("isActive") === 'on';

    try {
      await prisma.serviceCategory.update({
        where: { id: categoryId },
        data: {
          name,
          slug,
          description,
          icon,
          order,
          isActive
        }
      });
      
      redirect(`/admin/services/categories/${categoryId}?success=Category updated successfully`);
    } catch (error) {
      console.error('Error updating category:', error);
      redirect(`/admin/services/categories/${categoryId}?error=Failed to update category`);
    }
  }

  async function deleteCategory(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const categoryId = formData.get("categoryId") as string;

    try {
      await prisma.serviceCategory.delete({
        where: { id: categoryId }
      });
      
      redirect('/admin/services?tab=categories&success=Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      redirect(`/admin/services/categories/${categoryId}?error=Failed to delete category`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/services?tab=categories" 
          className="text-brand hover:text-brand-dark mb-4 inline-flex items-center text-sm"
        >
          ← Back to Categories
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Service Category
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Manage category details and settings
        </p>
      </div>

      {urlParams.error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{urlParams.error}</p>
        </div>
      )}

      {urlParams.success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{urlParams.success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Category Details
            </h2>
            
            <form action={updateCategory} className="space-y-6">
              <input type="hidden" name="categoryId" value={category.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={category.name}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={category.slug}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={category.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    name="icon"
                    defaultValue={category.icon || ''}
                    placeholder="🛡️"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    defaultValue={category.order}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={category.isActive}
                    className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active (visible in marketplace)
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Link
                  href="/admin/services?tab=categories"
                  className="btn-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Category Info
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                <p className="text-gray-900 dark:text-white">
                  {new Date(category.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Providers:</span>
                <p className="text-gray-900 dark:text-white">
                  {category.services.length} service provider{category.services.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  category.isActive 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <Link 
                href={`/services/categories/${category.slug}`}
                className="w-full btn-secondary text-center block"
              >
                View Public Page
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          {category.services.length === 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                Danger Zone
              </h3>
              
              <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                Delete this category. This action cannot be undone.
              </p>
              
              <form action={deleteCategory}>
                <input type="hidden" name="categoryId" value={category.id} />
                <ConfirmButton
                  confirmMessage={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Category
                </ConfirmButton>
              </form>
            </div>
          )}
          
          {category.services.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Cannot Delete
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                This category has {category.services.length} service provider{category.services.length !== 1 ? 's' : ''} and cannot be deleted. Remove all providers first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Service Providers using this category */}
      {category.services.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Service Providers using this category ({category.services.length})
          </h2>
          
          <div className="space-y-4">
            {category.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  {service.organization.logo ? (
                    <img 
                      src={service.organization.logo} 
                      alt={service.organization.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                      <span className="text-brand font-semibold">
                        {service.organization.name[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {service.organization.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {service.title || category.name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    service.organization.status === 'approved' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : service.organization.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {service.organization.status}
                  </span>
                  
                  <Link 
                    href={`/admin/services/providers/${service.organization.id}`}
                    className="text-brand hover:text-brand-dark text-sm font-medium"
                  >
                    View Provider
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}