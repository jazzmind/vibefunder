import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { stripe, STRIPE_CURRENCY, STRIPE_APP_FEE_BPS, DEST_ACCOUNT } from '@/lib/stripe';
import { z } from 'zod';

const Schema = z.object({ campaignId: z.string(), milestoneId: z.string() });

// MVP: on acceptance, capture milestone pct as a separate charge
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { campaignId, milestoneId } = Schema.parse(body);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    if (campaign.makerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.campaignId !== campaign.id) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });

    const amount = Math.floor((campaign.fundingGoalDollars * milestone.pct) / 100) * 100; // cents

    const pi = await stripe.paymentIntents.create({
      amount,
      currency: STRIPE_CURRENCY,
      capture_method: 'automatic',
      description: `Milestone capture (${milestone.name}) for campaign ${campaign.title}`,
      application_fee_amount: Math.floor((amount * STRIPE_APP_FEE_BPS) / 10000),
      transfer_data: DEST_ACCOUNT ? { destination: DEST_ACCOUNT } : undefined,
    });

    await prisma.milestone.update({ where: { id: milestone.id }, data: { status: 'accepted' } });

    return NextResponse.json({ success: true, paymentIntentId: pi.id, amount });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


