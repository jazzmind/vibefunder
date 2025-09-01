import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

interface OrganizationSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationSettingsPage({ params }: OrganizationSettingsPageProps) {
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
              role: { in: ['owner', 'admin'] }
            }
          }
        }
      ]
    },
    include: {
      owner: true,
      teamMembers: {
        include: { user: true },
        orderBy: { order: 'asc' }
      },
      services: {
        include: { category: true },
        orderBy: [
          { isFeatured: 'desc' },
          { order: 'asc' }
        ]
      }
    }
  });

  if (!organization) {
    notFound();
  }

  const isOwner = organization.ownerId === session.user.id;
  const userMembership = organization.teamMembers.find(m => m.userId === session.user.id);
  const canManage = isOwner || userMembership?.role === 'admin';

  if (!canManage) {
    redirect(`/organizations/dashboard`);
  }

  // Get available service categories
  const serviceCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' }
  });

  async function updateOrganization(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const website = formData.get("website") as string;
    const email = formData.get("email") as string;
    const listingVisibility = formData.get("listingVisibility") as string;
    const businessType = formData.get("businessType") as string;
    const taxId = formData.get("taxId") as string;

    await prisma.organization.update({
      where: { id },
      data: {
        name,
        description,
        shortDescription,
        website,
        email,
        listingVisibility,
        businessType,
        taxId
      }
    });

    redirect(`/organizations/${id}/settings?success=organization-updated`);
  }

  async function applyAsServiceProvider(formData: FormData) {
    "use server";
    
    const session = await auth();
    if (!session?.user?.id) {
      redirect('/signin');
    }

    const type = formData.get("type") as string;

    await prisma.organization.update({
      where: { id },
      data: {
        type,
        status: 'pending' // Reset to pending when applying as service provider
      }
    });

    redirect(`/organizations/${id}/settings?success=service-provider-application-submitted`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link 
              href="/organizations/dashboard"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Organization Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your organization profile, team, and services</p>
        </div>

        {/* Success Messages */}
        <div className="mb-6">
          {/* Success messages will be handled by URL params */}
        </div>

        <div className="space-y-8">
          {/* Basic Information */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Basic Information</h2>
            
            <form action={updateOrganization} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Name *
                  </label>
                  <input 
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={organization.name}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Email *
                  </label>
                  <input 
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={organization.email}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Short Description
                </label>
                <input 
                  id="shortDescription"
                  name="shortDescription"
                  type="text"
                  defaultValue={organization.shortDescription || ''}
                  placeholder="Brief tagline for your organization"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This will be displayed in directory listings and organization previews
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Description
                </label>
                <textarea 
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={organization.description || ''}
                  placeholder="Detailed description of your organization, mission, and capabilities"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website
                  </label>
                  <input 
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={organization.website || ''}
                    placeholder="https://yourorganization.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="listingVisibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Listing Visibility
                  </label>
                  <select 
                    id="listingVisibility"
                    name="listingVisibility"
                    defaultValue={organization.listingVisibility}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="public">Public - Visible to everyone</option>
                    <option value="creators_only">Creators Only - Visible to registered users</option>
                    <option value="limited">Limited - Visible but with restricted details</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business Type
                  </label>
                  <select 
                    id="businessType"
                    name="businessType"
                    defaultValue={organization.businessType || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select business type</option>
                    <option value="individual">Individual/Sole Proprietor</option>
                    <option value="company">Company/Corporation</option>
                    <option value="non_profit">Non-Profit Organization</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax ID (Optional)
                  </label>
                  <input 
                    id="taxId"
                    name="taxId"
                    type="text"
                    defaultValue={organization.taxId || ''}
                    placeholder="EIN or SSN"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn">
                  Save Changes
                </button>
              </div>
            </form>
          </section>

          {/* Organization Type & Status */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Organization Type & Status</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Current Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your organization is currently a <strong>{organization.type.replace('_', ' ')}</strong> with status: 
                    <span className={`ml-1 font-medium ${
                      organization.status === 'approved' ? 'text-green-600' : 
                      organization.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {organization.status}
                    </span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    organization.type === 'service_provider' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {organization.type === 'service_provider' ? 'Service Provider' : 'Creator Organization'}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    organization.status === 'approved' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : organization.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {organization.status.charAt(0).toUpperCase() + organization.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Service Provider Application */}
              {organization.type !== 'service_provider' && (
                <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Apply as Service Provider</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Service providers can offer their services to campaign creators and appear in the service directory.
                    This requires approval from our team.
                  </p>
                  <form action={applyAsServiceProvider}>
                    <input type="hidden" name="type" value="service_provider" />
                    <button type="submit" className="btn bg-blue-600 hover:bg-blue-700">
                      Apply as Service Provider
                    </button>
                  </form>
                </div>
              )}

              {/* Creator Application (if service provider wants both) */}
              {organization.type === 'service_provider' && (
                <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Dual Capability</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Your organization can both create campaigns and provide services. Campaign creation is always available,
                    while service provision requires approval.
                  </p>
                  <div className="flex space-x-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Campaign Creation Enabled
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      organization.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {organization.status === 'approved' ? '✓ Service Provision Enabled' : '⏳ Service Provision Pending'}
                    </span>
                  </div>
                </div>
              )}

              {organization.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Admin Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{organization.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Links */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href={`/organizations/${organization.id}/team`}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Team Members</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {organization.teamMembers.length} members
                    </p>
                  </div>
                </div>
              </Link>

              <Link 
                href={`/organizations/${organization.id}/services`}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🛠️</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Services</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {organization.services.length} services
                    </p>
                  </div>
                </div>
              </Link>

              <Link 
                href={`/organizations/${organization.id}/campaigns`}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Campaigns</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manage all campaigns
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
