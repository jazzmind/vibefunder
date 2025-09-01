import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import DynamicFormFields from "@/components/DynamicFormFields";

interface NewServicePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; error?: string }>;
}

export default async function NewServicePage({ params, searchParams }: NewServicePageProps) {
  const { id } = await params;
  const { category: selectedCategoryId, error } = await searchParams;
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/signin');
  }

  // Get organization with permissions check
  const organization = await prisma.organization.findFirst({
    where: { 
      id,
      status: 'approved', // Only approved organizations can add services
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
      }
    }
  });

  if (!organization) {
    notFound();
  }

  // Get available service categories (excluding ones already in use)
  const usedCategoryIds = organization.services.map(s => s.categoryId);
  const availableCategories = await prisma.serviceCategory.findMany({
    where: { 
      isActive: true,
      NOT: { id: { in: usedCategoryIds } }
    },
    orderBy: { order: 'asc' }
  });

  if (availableCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Available Categories</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your organization already offers services in all available categories.
            </p>
            <Link href={`/organizations/${id}/services`} className="btn">
              Back to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function createService(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const categoryId = formData.get("categoryId") as string;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const estimatedTime = formData.get("estimatedTime") as string | null;
    const isFeatured = formData.get("isFeatured") === 'on';

    // Get deliverables from form (dynamic inputs)
    const deliverables: string[] = [];
    let i = 0;
    while (formData.get(`deliverables-${i}`)) {
      const deliverable = formData.get(`deliverables-${i}`) as string;
      if (deliverable && deliverable.trim()) {
        deliverables.push(deliverable.trim());
      }
      i++;
    }

    // Get prerequisites from form (dynamic inputs)
    const prerequisites: string[] = [];
    i = 0;
    while (formData.get(`prerequisites-${i}`)) {
      const prerequisite = formData.get(`prerequisites-${i}`) as string;
      if (prerequisite && prerequisite.trim()) {
        prerequisites.push(prerequisite.trim());
      }
      i++;
    }

    // Get the category to use its name as default title
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      redirect(`/organizations/${id}/services/new?error=invalid-category`);
      return;
    }

        try {
      await prisma.organizationService.create({
        data: {
          organizationId: id,
          categoryId,
          title: (title && title.trim()) ? title.trim() : category.name,
          description: (description && description.trim()) ? description.trim() : null,
          estimatedTime: (estimatedTime && estimatedTime.trim()) ? estimatedTime.trim() : null,
          deliverables: deliverables.length > 0 ? deliverables : undefined,
          prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
          isFeatured,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Database error creating service:', error);
      redirect(`/organizations/${id}/services/new?error=creation-failed`);
      return;
    }

    // Redirect on success (outside try/catch to avoid catching redirect)
    redirect(`/organizations/${id}/services?success=service-added`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <p className="text-gray-600 dark:text-gray-300">Add a new service to your organization's offerings</p>
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">
                {error === 'creation-failed' && 'Failed to create service. Please try again.'}
              </p>
            </div>
          )}
        </div>

        <form action={createService} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Category *
            </label>
            <select 
              id="categoryId"
              name="categoryId"
              required
              defaultValue={selectedCategoryId || ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a category</option>
              {availableCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Choose the category that best describes this service
            </p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Service Title (Optional)
            </label>
            <input 
              id="title"
              name="title"
              type="text"
              placeholder="Leave blank to use category name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Override the category name with a custom title for this service
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Description
            </label>
            <textarea 
              id="description"
              name="description"
              rows={4}
              placeholder="Describe what this service includes, your approach, and what makes your offering unique"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Timeline
            </label>
            <input 
              id="estimatedTime"
              name="estimatedTime"
              type="text"
              placeholder="e.g., 2-4 weeks, 1-3 months, 30-60 days"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Typical time range for completing this service
            </p>
          </div>

          <DynamicFormFields
            fieldName="deliverables"
            label="Deliverables"
            placeholder="What will the client receive? (e.g., Complete website, Source code)"
          />

          <DynamicFormFields
            fieldName="prerequisites"
            label="Prerequisites (Optional)"
            placeholder="What do you need from the client? (e.g., Brand guidelines, Content)"
          />

          <div className="form-control">
            <label className="label cursor-pointer justify-start space-x-3">
              <input 
                type="checkbox" 
                name="isFeatured" 
                className="checkbox checkbox-primary" 
              />
              <span className="label-text text-gray-700 dark:text-gray-300">Feature this service</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Featured services appear first in your profile and directory listings
            </p>
          </div>

          <div className="flex justify-between pt-6">
            <Link href={`/organizations/${id}/services`} className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn">
              Add Service
            </button>
          </div>
        </form>
      </div>


    </div>
  );
}
