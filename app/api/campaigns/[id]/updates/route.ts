import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendCampaignUpdateEmail } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, isPublic, sendEmail } = await request.json();

    // Get campaign and check permissions
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { 
        teamMembers: true,
        pledges: { include: { backer: true } }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const isOwner = campaign.makerId === session.user.id;
    const isTeamMember = campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isAdmin = session.user.roles?.includes('admin') || false;
    
    if (!isOwner && !isTeamMember && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create the update
    const update = await prisma.campaignUpdate.create({
      data: {
        campaignId: id,
        authorId: session.user.id,
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
            authorName: session.user.email || 'Campaign Team',
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

    return NextResponse.json({ success: true, update });
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json({ error: 'Failed to create update' }, { status: 500 });
  }
}
