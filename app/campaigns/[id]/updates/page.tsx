import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { sendCampaignUpdateEmail } from "@/lib/email";

export default async function CampaignUpdates({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  const campaign = await prisma.campaign.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      maker: true,
      teamMembers: { include: { user: true } },
      updates: { 
        include: { author: true },
        orderBy: { createdAt: 'desc' }
      },
      pledges: { select: { backer: { select: { email: true } } } }
    }
  });

  if (!campaign) {
    return notFound();
  }

  // Check user permissions
  const isOwner = session && campaign.makerId === session.userId;
  const isTeamMember = session && campaign.teamMembers.some((tm: any) => tm.userId === session.userId);
  const canCreateUpdate = isOwner || isTeamMember;

  async function createUpdate(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        teamMembers: true,
        pledges: { include: { backer: true } }
      }
    });

    if (!campaign) {
      return notFound();
    }

    const isOwner = campaign.makerId === session.userId;
    const isTeamMember = campaign.teamMembers.some((tm: any) => tm.userId === session.userId);
    const isAdmin = session.roles?.includes('admin') || false;
    
    if (!isOwner && !isTeamMember && !isAdmin) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const isPublic = formData.get("isPublic") === 'on';
    const sendEmail = formData.get("sendEmail") === 'on';

    const update = await prisma.campaignUpdate.create({
      data: {
        campaignId: resolvedParams.id,
        authorId: session.userId,
        title,
        content,
        isPublic,
        emailSent: false
      }
    });

    // Send emails to backers if requested
    if (sendEmail && campaign.pledges.length > 0) {
      const emailPromises = campaign.pledges.map(async (pledge) => {
        try {
          await sendCampaignUpdateEmail(pledge.backer.email, {
            campaignTitle: campaign.title,
            campaignId: campaign.id,
            updateTitle: title,
            updateContent: content,
            authorName: session.email || 'Campaign Team',
            isPublic: isPublic
          });
          return true;
        } catch (error) {
          console.error(`Failed to send email to ${pledge.backer.email}:`, error);
          return false;
        }
      });
      
      // Wait for all emails to be sent (or fail)
      const emailResults = await Promise.allSettled(emailPromises);
      const successCount = emailResults.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      console.log(`✓ Sent update emails: ${successCount}/${campaign.pledges.length} successful`);
      
      // Mark as sent if at least one email was successful
      if (successCount > 0) {
        await prisma.campaignUpdate.update({
          where: { id: update.id },
          data: { emailSent: true }
        });
      }
    }

    redirect(`/campaigns/${resolvedParams.id}/updates`);
  }

  async function deleteUpdate(formData: FormData) {
    "use server";
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }

    const updateId = formData.get("updateId") as string;
    
    const update = await prisma.campaignUpdate.findUnique({
      where: { id: updateId },
      include: { campaign: { include: { teamMembers: true } } }
    });

    if (!update) {
      redirect('/campaigns/' + resolvedParams.id + '/updates');
    }

    const isOwner = update.campaign.makerId === session.userId;
    const isTeamMember = update.campaign.teamMembers.some((tm: any) => tm.userId === session.userId);
    const isAuthor = update.authorId === session.userId;
    
    if (!isOwner && !isTeamMember && !isAuthor) {
      redirect('/campaigns/' + resolvedParams.id);
    }

    await prisma.campaignUpdate.delete({
      where: { id: updateId }
    });

    redirect(`/campaigns/${resolvedParams.id}/updates`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Campaign Updates
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Campaign: {campaign.title}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Updates ({campaign.updates.length})
          </h2>
          
          {campaign.updates.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No updates posted yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {campaign.updates.map((update: any) => (
                <div key={update.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{update.title}</h3>
                        {update.isPublic ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                            Backers Only
                          </span>
                        )}
                        {update.emailSent && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                            ✉ Emailed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span>by {update.author.name || update.author.email.split('@')[0]}</span>
                        <span>•</span>
                        <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {(isOwner || isTeamMember || update.authorId === session?.userId) && (
                      <form action={deleteUpdate} className="ml-4">
                        <input type="hidden" name="updateId" value={update.id} />
                        <button 
                          type="submit"
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          onClick={(e) => {
                            if (!confirm('Are you sure you want to delete this update?')) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    )}
                  </div>
                  
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {update.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canCreateUpdate && (
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Post Update</h2>
            
            <form action={createUpdate} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Title
                </label>
                <input 
                  id="title"
                  name="title" 
                  placeholder="e.g., Milestone 1 Complete!"
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Content
                </label>
                <textarea 
                  id="content"
                  name="content" 
                  placeholder="Share your progress, challenges, or exciting news with your backers..."
                  rows={8}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Visibility & Notifications
                </label>
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input 
                      type="checkbox" 
                      name="isPublic" 
                      defaultChecked
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Public Update</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Visible to everyone, not just backers
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start">
                    <input 
                      type="checkbox" 
                      name="sendEmail" 
                      defaultChecked
                      className="h-4 w-4 text-brand focus:ring-brand border-gray-300 mt-0.5" 
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Email Backers</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Send email notification to all backers ({campaign.pledges.length} people)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" className="w-full btn">
                Post Update
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <Link href={`/campaigns/${campaign.id}`} className="btn-secondary">
          Back to Campaign
        </Link>
        <Link href={`/campaigns/${campaign.id}/edit`} className="btn-secondary">
          Edit Campaign
        </Link>
      </div>
    </div>
  );
}