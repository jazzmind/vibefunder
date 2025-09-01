import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function RFPMarketplacePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/signin?redirect=/rfps');
  }

  // Get the user's service provider organization
  const organization = await prisma.organization.findFirst({
    where: {
      ownerId: session.user.id,
      type: 'service_provider',
      status: 'approved'
    },
    include: {
      services: {
        include: {
          category: true
        }
      }
    }
  });

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Service Provider Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You need to be an approved service provider to view and bid on RFPs.
          </p>
          <Link href="/organizations/new" className="btn">
            Become a Service Provider
          </Link>
        </div>
      </div>
    );
  }

  // Get service category IDs that this organization offers
  const myServiceCategoryIds = organization.services.map(s => s.categoryId);

  // Get open RFPs that match the organization's service categories
  const relevantRFPs = await prisma.rFP.findMany({
    where: {
      status: 'open',
      // Filter by relevant service categories (check if any of the RFP's categories match ours)
      // Note: serviceCategoryIds is a JSON array, so we need to use array operations
    },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          organization: {
            select: {
              name: true,
              logo: true
            }
          }
        }
      },
      bids: {
        where: {
          organizationId: organization.id
        },
        select: {
          id: true,
          status: true,
          submittedAt: true
        }
      },
      _count: {
        select: {
          bids: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Filter RFPs by service categories (since Prisma doesn't handle JSON array intersection well)
  const filteredRFPs = relevantRFPs.filter(rfp => {
    const rfpCategoryIds = rfp.serviceCategoryIds as string[];
    return rfpCategoryIds.some(categoryId => myServiceCategoryIds.includes(categoryId));
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              RFP Marketplace
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Find project opportunities that match your expertise. Submit bids to win work from innovative campaigns.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Service Categories Filter */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Service Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {organization.services.map((service) => (
              <span
                key={service.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand/10 text-brand"
              >
                {service.category.icon} {service.category.name}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Showing RFPs that match your service categories
          </p>
        </div>

        {/* RFPs List */}
        {filteredRFPs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No Matching RFPs Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              There are currently no open RFPs that match your service categories. Check back later or expand your service offerings.
            </p>
            <Link href="/organizations/dashboard?tab=services" className="btn">
              Manage Your Services
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRFPs.map((rfp) => {
              const myBid = rfp.bids[0]; // User can only have one bid per RFP
              const budget = rfp.budget ? (rfp.budget / 100) : null;
              const deadline = rfp.deadline ? new Date(rfp.deadline) : null;
              
              return (
                <div
                  key={rfp.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {rfp.campaign.organization?.logo ? (
                          <img 
                            src={rfp.campaign.organization.logo} 
                            alt={rfp.campaign.organization.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-brand/10 rounded flex items-center justify-center">
                            <span className="text-sm">🏢</span>
                          </div>
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {rfp.campaign.organization?.name || 'Anonymous'}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {rfp.title}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {rfp.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {budget && (
                          <span className="flex items-center space-x-1">
                            <span>💰</span>
                            <span>Budget: ${budget.toLocaleString()}</span>
                          </span>
                        )}
                        {deadline && (
                          <span className="flex items-center space-x-1">
                            <span>📅</span>
                            <span>Deadline: {deadline.toLocaleDateString()}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <span>📋</span>
                          <span>{rfp._count.bids} bid{rfp._count.bids !== 1 ? 's' : ''}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="ml-6 flex flex-col items-end space-y-2">
                      {myBid ? (
                        <div className="text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            myBid.status === 'submitted' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : myBid.status === 'accepted'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {myBid.status === 'submitted' && '⏳ Bid Submitted'}
                            {myBid.status === 'accepted' && '✅ Bid Accepted'}
                            {myBid.status === 'rejected' && '❌ Bid Rejected'}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {myBid.submittedAt ? new Date(myBid.submittedAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                      ) : (
                        <Link
                          href={`/rfps/${rfp.id}`}
                          className="btn"
                        >
                          View & Bid
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  {/* Service Categories */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(rfp.serviceCategoryIds as string[]).map((categoryId) => {
                      const matchingService = organization.services.find(s => s.categoryId === categoryId);
                      return matchingService ? (
                        <span
                          key={categoryId}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        >
                          {matchingService.category.icon} {matchingService.category.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
