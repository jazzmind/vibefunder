import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";

interface AdminServiceProviderDetailProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AdminServiceProviderDetail({ 
  params, 
  searchParams 
}: AdminServiceProviderDetailProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  const session = await auth();
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect('/signin');
  }

  const provider = await prisma.organization.findUnique({
    where: { 
      id,
      type: 'service_provider'
    },
    include: {
      owner: true,
      services: {
        include: { category: true },
        orderBy: { order: 'asc' }
      },
      teamMembers: {
        include: { user: true },
        orderBy: { order: 'asc' }
      },
      approver: true
    }
  });

  if (!provider) {
    notFound();
  }

  async function updateProviderStatus(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const providerId = formData.get("providerId") as string;
    const status = formData.get("status") as string;

    try {
      await prisma.organization.update({
        where: { id: providerId },
        data: { 
          status,
          approvedAt: status === 'approved' ? new Date() : null,
          approvedBy: status === 'approved' ? session.user.id : null
        }
      });
      
      redirect(`/admin/services/providers/${providerId}?success=Provider status updated successfully`);
    } catch (error) {
      console.error('Error updating provider status:', error);
      redirect(`/admin/services/providers/${providerId}?error=Failed to update provider status`);
    }
  }

  async function deleteProvider(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.roles?.includes('admin')) {
      redirect('/signin');
    }

    const providerId = formData.get("providerId") as string;

    try {
      await prisma.organization.delete({
        where: { id: providerId }
      });
      
      redirect('/admin/services?success=Service provider deleted successfully');
    } catch (error) {
      console.error('Error deleting provider:', error);
      redirect(`/admin/services/providers/${providerId}?error=Failed to delete provider`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link 
            href="/admin/services" 
            className="text-brand hover:text-brand-dark mb-4 inline-flex items-center text-sm"
          >
            ← Back to Services
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {provider.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Service Provider Details & Management
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link 
            href={`/services/providers/${provider.id}`}
            className="btn-secondary"
          >
            View Public Page
          </Link>
        </div>
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Provider Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Provider Overview
            </h2>
            
            <div className="flex items-start space-x-4 mb-6">
              {provider.logo ? (
                <img 
                  src={provider.logo} 
                  alt={provider.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-brand/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {provider.name}
                </h3>
                {provider.shortDescription && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {provider.shortDescription}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {provider.website && (
                    <a 
                      href={provider.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-brand"
                    >
                      🌐 Website
                    </a>
                  )}
                  <span>📧 {provider.email}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h4>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  provider.status === 'approved' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : provider.status === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {provider.status}
                </span>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Visibility</h4>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  provider.listingVisibility === 'public'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : provider.listingVisibility === 'creators_only'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {provider.listingVisibility.replace('_', ' ')}
                </span>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Created</h4>
                <p className="text-gray-900 dark:text-white">
                  {new Date(provider.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              {provider.approvedAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Approved</h4>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(provider.approvedAt).toLocaleDateString()}
                  </p>
                  {provider.approver && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      by {provider.approver.email}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {provider.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h4>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {provider.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Owner Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Owner Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Name</h4>
                <p className="text-gray-900 dark:text-white">
                  {provider.owner.name || 'Not provided'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Email</h4>
                <p className="text-gray-900 dark:text-white">
                  {provider.owner.email}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Organization</h4>
                <p className="text-gray-900 dark:text-white">
                  {provider.owner.org || 'Not provided'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Roles</h4>
                <p className="text-gray-900 dark:text-white">
                  {provider.owner.roles.join(', ') || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Services Offered ({provider.services.length})
            </h2>
            
            {provider.services.length > 0 ? (
              <div className="space-y-4">
                {provider.services.map((service) => (
                  <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{service.category.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {service.title || service.category.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {service.category.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {service.isFeatured && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                            Featured
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          service.isActive 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-700 dark:text-gray-300 mt-3">
                        {service.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No services configured</p>
            )}
          </div>

          {/* Team Members */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Team Members ({provider.teamMembers.length})
            </h2>
            
            {provider.teamMembers.length > 0 ? (
              <div className="space-y-4">
                {provider.teamMembers.map((member) => (
                  <div key={member.id} className="flex items-start space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.role} • {member.isPubliclyVisible ? 'Public' : 'Private'}
                      </p>
                      {member.bio && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{member.bio}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No team members configured</p>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Provider Status
            </h3>
            
            <form action={updateProviderStatus} className="space-y-3">
              <input type="hidden" name="providerId" value={provider.id} />
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="pending" 
                  defaultChecked={provider.status === 'pending'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Pending Review</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="approved" 
                  defaultChecked={provider.status === 'approved'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Approved</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="status" 
                  value="rejected" 
                  defaultChecked={provider.status === 'rejected'}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300" 
                />
                <span className="ml-3">Rejected</span>
              </label>
              
              <button 
                type="submit" 
                className="w-full btn mt-4"
              >
                Update Status
              </button>
            </form>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <Link 
                href={`/services/providers/${provider.id}`}
                className="w-full btn-secondary text-center block"
              >
                View Public Page
              </Link>
              
              <Link 
                href={`/admin/organizations/${provider.id}`}
                className="w-full btn-secondary text-center block"
              >
                View as Organization
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
              Danger Zone
            </h3>
            
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              Deleting this service provider will permanently remove all associated data including services and team members. This action cannot be undone.
            </p>
            
            <form action={deleteProvider}>
              <input type="hidden" name="providerId" value={provider.id} />
              <ConfirmButton
                confirmMessage={`Are you sure you want to delete "${provider.name}"? This action cannot be undone and will remove all associated data.`}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete Service Provider
              </ConfirmButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}