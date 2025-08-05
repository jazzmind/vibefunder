import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminNewServiceCategory({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; success?: string }> 
}) {
  const params = await searchParams;
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  // Get the next order number
  const lastCategory = await prisma.serviceCategory.findFirst({
    orderBy: { order: 'desc' }
  });
  const nextOrder = (lastCategory?.order || 0) + 1;

  async function createCategory(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const order = parseInt(formData.get("order") as string);
    const isActive = formData.get("isActive") === 'on';

    try {
      // Check if slug already exists
      const existingCategory = await prisma.serviceCategory.findUnique({
        where: { slug }
      });

      if (existingCategory) {
        redirect(`/admin/services/categories/new?error=A category with slug "${slug}" already exists`);
        return;
      }

      const category = await prisma.serviceCategory.create({
        data: {
          name,
          slug,
          description,
          icon,
          order,
          isActive
        }
      });
      
      redirect(`/admin/services/categories/${category.id}?success=Category created successfully`);
    } catch (error) {
      console.error('Error creating category:', error);
      redirect('/admin/services/categories/new?error=Failed to create category');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/services?tab=categories" 
          className="text-brand hover:text-brand-dark mb-4 inline-flex items-center text-sm"
        >
          ← Back to Categories
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Service Category
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Add a new category for service providers
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

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Category Details
        </h2>
        
        <form action={createCategory} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g., Cybersecurity Testing"
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
                placeholder="e.g., cybersecurity-testing"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                URL-friendly version (lowercase, hyphens)
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              placeholder="Brief description of what services this category includes"
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
                placeholder="🛡️"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Single emoji to represent this category
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Order
              </label>
              <input
                type="number"
                name="order"
                defaultValue={nextOrder}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-brand focus:border-brand bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lower numbers appear first
              </p>
            </div>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={true}
                className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active (visible in marketplace)
              </span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
              Create Category
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          Tips for Creating Categories
        </h3>
        
        <ul className="space-y-2 text-blue-700 dark:text-blue-300 text-sm">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Choose clear, descriptive names that service providers and customers will understand
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Use URL-friendly slugs (lowercase letters, numbers, and hyphens only)
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Select an emoji that visually represents the category type
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Set display order to control how categories appear in listings
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            Categories can be made inactive to hide them without deleting
          </li>
        </ul>
      </div>
    </div>
  );
}