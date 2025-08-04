import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeletePledgeTierButton } from "./DeletePledgeTierButton";

export default async function ManagePledgeTiers({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      maker: true,
      teamMembers: { include: { user: true } },
      pledgeTiers: { orderBy: { order: 'asc' } }
    }
  });

  if (!campaign) {
    return notFound();
  }

  // Check if user has permission to edit
  const isOwner = campaign.makerId === session.userId;
  const isTeamMember = campaign.teamMembers.some(tm => tm.userId === session.userId);
  const isAdmin = session.roles?.includes('admin') || false;
  
  if (!isOwner && !isTeamMember && !isAdmin) {
    redirect('/campaigns/' + resolvedParams.id);
  }

  const canEdit = isOwner || isTeamMember || isAdmin;

  async function createPledgeTier(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const amountDollars = Number(formData.get("amountDollars") || 0);
    const benefits = formData.getAll("benefits").filter(b => b.toString().trim()) as string[];
    const order = Number(formData.get("order") || 1);

    if (!title || amountDollars <= 0) {
      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?error=invalid-data`);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pledge-tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionToken}`
        },
        body: JSON.stringify({
          campaignId: resolvedParams.id,
          title,
          description: description || null,
          amountDollars,
          benefits,
          order
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create pledge tier');
      }

      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?success=created`);
    } catch (error) {
      console.error('Error creating pledge tier:', error);
      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?error=create-failed`);
    }
  }

  async function deletePledgeTier(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const pledgeTierId = formData.get("pledgeTierId") as string;

    if (!pledgeTierId) {
      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?error=invalid-id`);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pledge-tiers?id=${pledgeTierId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `session=${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete pledge tier');
      }

      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?success=deleted`);
    } catch (error) {
      console.error('Error deleting pledge tier:', error);
      redirect(`/campaigns/${resolvedParams.id}/pledge-tiers?error=delete-failed`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Manage Pledge Tiers</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Configure pledge amounts and rewards for {campaign.title}
            </p>
          </div>
          <Link 
            href={`/campaigns/${campaign.id}`}
            className="btn-secondary"
          >
            Back to Campaign
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Current Pledge Tiers</h2>
          
          {campaign.pledgeTiers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No custom pledge tiers created yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Using default tiers: $1K, $5K, $10K, $25K, $50K
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.pledgeTiers.map((tier) => (
                <div key={tier.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${tier.amountDollars.toLocaleString()}
                        </h3>
                        <span className="text-sm font-medium text-brand">
                          {tier.title}
                        </span>
                        {!tier.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {tier.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tier.description}</p>
                      )}
                      {tier.benefits && (tier.benefits as string[]).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Benefits:</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {(tier.benefits as string[]).map((benefit, i) => (
                              <li key={i}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Order: {tier.order}</p>
                    </div>
                    {canEdit && (
                      <DeletePledgeTierButton 
                        pledgeTierId={tier.id}
                        deletePledgeTier={deletePledgeTier}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Pledge Tier</h2>
            
            <form action={createPledgeTier} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input 
                    id="title"
                    name="title" 
                    type="text"
                    required 
                    placeholder="e.g., Strategic Partner"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="amountDollars" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount ($)
                  </label>
                  <input 
                    id="amountDollars"
                    name="amountDollars" 
                    type="number"
                    required 
                    min="100"
                    placeholder="5000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea 
                  id="description"
                  name="description" 
                  rows={2}
                  placeholder="Brief description of this tier..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefits/Perks
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <input 
                      key={index}
                      name="benefits" 
                      type="text"
                      placeholder={`Benefit ${index + 1} (optional)`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input 
                  id="order"
                  name="order" 
                  type="number"
                  min="1"
                  defaultValue={campaign.pledgeTiers.length + 1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <button type="submit" className="w-full btn">
                Add Pledge Tier
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Tips for Effective Pledge Tiers</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Start with accessible amounts ($100-$1,000)</li>
                <li>• Offer clear value for higher tiers</li>
                <li>• Include meaningful benefits and perks</li>
                <li>• Order from lowest to highest amount</li>
                <li>• Consider your target audience's budget</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}