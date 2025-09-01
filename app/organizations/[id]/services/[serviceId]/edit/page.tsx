import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import DynamicFormFields from "@/components/DynamicFormFields";

interface EditServicePageProps {
  params: Promise<{ id: string; serviceId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function EditServicePage({ params, searchParams }: EditServicePageProps) {
  const { id, serviceId } = await params;
  const { error, success } = await searchParams;
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
    }
  });

  if (!organization) {
    notFound();
  }

  // Get the service
  const service = await prisma.organizationService.findFirst({
    where: { 
      id: serviceId,
      organizationId: id
    },
    include: {
      category: true
    }
  });

  if (!service) {
    notFound();
  }

  async function updateService(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const estimatedTime = formData.get("estimatedTime") as string | null;
    const isFeatured = formData.get("isFeatured") === 'on';
    const isActive = formData.get("isActive") === 'on';



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



    // Get the current service to get category name as fallback
    const currentService = await prisma.organizationService.findUnique({
      where: { id: serviceId },
      include: { category: true }
    });

    if (!currentService) {
      redirect(`/organizations/${id}/services?error=service-not-found`);
      return;
    }

    const updateData: any = {
      isFeatured,
      isActive
    };

    // Only update fields that have values
    if (title && title.trim()) {
      updateData.title = title.trim();
    }
    if (description !== null) {
      updateData.description = description?.trim() || null;
    }
    if (estimatedTime !== null) {
      updateData.estimatedTime = estimatedTime?.trim() || null;
    }
    if (deliverables.length > 0) {
      updateData.deliverables = deliverables;
    } else {
      updateData.deliverables = undefined;
    }
    if (prerequisites.length > 0) {
      updateData.prerequisites = prerequisites;
    } else {
      updateData.prerequisites = undefined;
    }

    try {
      await prisma.organizationService.update({
        where: { id: serviceId },
        data: updateData
      });
    } catch (error) {
      console.error('Database error updating service:', error);
      redirect(`/organizations/${id}/services/${serviceId}/edit?error=update-failed`);
      return;
    }

    // Redirect on success (outside try/catch to avoid catching redirect)
    redirect(`/organizations/${id}/services?success=service-updated`);
  }

  // Parse existing deliverables and prerequisites
  const existingDeliverables = service.deliverables ? 
    (Array.isArray(service.deliverables) ? service.deliverables : JSON.parse(service.deliverables as string)) as string[] : [];
  const existingPrerequisites = service.prerequisites ? 
    (Array.isArray(service.prerequisites) ? service.prerequisites : JSON.parse(service.prerequisites as string)) as string[] : [];

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Edit Service</h1>
          <p className="text-gray-600 dark:text-gray-300">Update your {service.category.name} service</p>
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">
                {error === 'update-failed' && 'Failed to update service. Please try again.'}
              </p>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                Service updated successfully!
              </p>
            </div>
          )}
        </div>

        <form action={updateService} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{service.category.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{service.category.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{service.category.description}</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Service Title (Optional)
            </label>
            <input 
              id="title"
              name="title"
              type="text"
              defaultValue={service.title || ''}
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
              defaultValue={service.description || ''}
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
              defaultValue={service.estimatedTime || ''}
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
            initialValues={existingDeliverables}
          />

          <DynamicFormFields
            fieldName="prerequisites"
            label="Prerequisites (Optional)"
            placeholder="What do you need from the client? (e.g., Brand guidelines, Content)"
            initialValues={existingPrerequisites}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label cursor-pointer justify-start space-x-3">
                <input 
                  type="checkbox" 
                  name="isActive" 
                  defaultChecked={service.isActive}
                  className="checkbox checkbox-primary" 
                />
                <span className="label-text text-gray-700 dark:text-gray-300">Service is active</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Active services are visible to potential clients
              </p>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start space-x-3">
                <input 
                  type="checkbox" 
                  name="isFeatured" 
                  defaultChecked={service.isFeatured}
                  className="checkbox checkbox-primary" 
                />
                <span className="label-text text-gray-700 dark:text-gray-300">Feature this service</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Featured services appear first in listings
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Link href={`/organizations/${id}/services`} className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn">
              Update Service
            </button>
          </div>
        </form>
      </div>


    </div>
  );
}
