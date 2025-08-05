import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendPledgeConfirmationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = (req.headers.get("stripe-signature") || "") as string;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  
  if (!whSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }
  
  let raw: string;
  try {
    raw = await req.text();
  } catch (error) {
    console.error('Failed to read request body:', error);
    return new NextResponse('Failed to read request body', { status: 400 });
  }
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(event: any) {
  const session = event.data.object;
  const { campaignId, pledgeTierId, backerId } = session.metadata || {};
  
  if (!campaignId || !backerId) {
    console.error('Missing required metadata in checkout session');
    return;
  }
  
  // Create pledge record
  const pledgeData: any = {
    campaignId,
    backerId,
    amountDollars: Math.round(session.amount_total / 100),
    currency: session.currency.toUpperCase(),
    status: 'pending',
    paymentRef: session.payment_intent,
    stripeSessionId: session.id
  };
  
  if (pledgeTierId) {
    pledgeData.pledgeTierId = pledgeTierId;
  }
  
  const pledge = await prisma.pledge.create({
    data: pledgeData,
    include: {
      backer: true,
      campaign: true
      // pledgeTier: true // TODO: Add pledgeTier relation to Pledge model
    }
  });
  
  // Update campaign raised amount
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      raisedDollars: {
        increment: pledge.amountDollars
      }
    }
  });
  
  console.log(`✓ Created pledge ${pledge.id} for campaign ${campaignId}`);
}

async function handlePaymentIntentSucceeded(event: any) {
  const paymentIntent = event.data.object;
  const { campaignId, backerId } = paymentIntent.metadata || {};
  
  // Update pledge status to captured
  const pledge = await prisma.pledge.updateMany({
    where: {
      paymentRef: paymentIntent.id,
      status: 'pending'
    },
    data: {
      status: 'captured'
    }
  });
  
  if (pledge.count > 0) {
    // Get the updated pledge to send confirmation email
    const updatedPledge = await prisma.pledge.findFirst({
      where: { paymentRef: paymentIntent.id },
      include: {
        backer: true,
        campaign: true,
        // pledgeTier: true // TODO: Add pledgeTier relation to Pledge model
      }
    });
    
    if (updatedPledge) {
      try {
        await sendPledgeConfirmationEmail(updatedPledge.backer.email, {
          campaignTitle: updatedPledge.campaign.title,
          campaignId: updatedPledge.campaign.id,
          pledgeAmount: updatedPledge.amountDollars,
          backerName: updatedPledge.backer.name || undefined,
          // pledgeTierTitle: updatedPledge.pledgeTier?.title // TODO: Add after pledgeTier relation exists
        });
        console.log(`✓ Sent pledge confirmation email to ${updatedPledge.backer.email}`);
      } catch (error) {
        console.error('Failed to send pledge confirmation email:', error);
      }
    }
    
    console.log(`✓ Updated pledge status to captured for payment ${paymentIntent.id}`);
  }
}

async function handlePaymentIntentFailed(event: any) {
  const paymentIntent = event.data.object;
  
  // Update pledge status to failed
  const pledge = await prisma.pledge.updateMany({
    where: {
      paymentRef: paymentIntent.id,
      status: 'pending'
    },
    data: {
      status: 'failed'
    }
  });
  
  if (pledge.count > 0) {
    console.log(`✓ Updated pledge status to failed for payment ${paymentIntent.id}`);
  }
}