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
    // Clone the request to avoid body consumption issues in tests
    const clonedRequest = req.clone();
    raw = await clonedRequest.text();
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
  
  // Handle malformed or missing webhook data gracefully
  if (!event || !event.type) {
    console.log('Received webhook event with missing type, ignoring');
    return NextResponse.json({ received: true });
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
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event);
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

// Utility function to sanitize and validate metadata
function sanitizeMetadata(metadata: any): { [key: string]: string } | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  const sanitized: { [key: string]: string } = {};
  const allowedKeys = ['campaignId', 'pledgeTierId', 'backerId', 'source', 'utmCampaign', 'referrer'];
  
  for (const key of allowedKeys) {
    if (metadata[key] && typeof metadata[key] === 'string') {
      // Basic sanitization - remove potentially dangerous characters
      const value = metadata[key].toString().trim();
      
      // Check for clearly malicious patterns - be more specific to avoid false positives
      const maliciousPatterns = [
        /<script[^>]*>/i,          // Script tags
        /javascript:/i,            // JavaScript protocols
        /on\w+\s*=/i,             // Event handlers
        /'.*drop.*table.*'/i,      // SQL drop table
        /['"];.*drop/i,            // SQL injection attempts
        /\$\{.*process\.env/i,     // Template injection with env vars
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g  // Control characters (excluding tab, newline, carriage return)
      ];
      
      let isMalicious = false;
      for (const pattern of maliciousPatterns) {
        if (pattern.test(value)) {
          console.warn(`Blocked potentially malicious metadata: ${key}=${value}`);
          isMalicious = true;
          break;
        }
      }
      
      // Check for overly long values (increase limit to 200 for better compatibility)
      if (!isMalicious && value.length <= 200) {
        sanitized[key] = value;
      } else if (value.length > 200) {
        console.warn(`Metadata value too long for key ${key}: ${value.length} characters`);
      }
    }
  }
  
  return sanitized;
}

async function handleCheckoutSessionCompleted(event: any) {
  // Handle missing or malformed event data
  if (!event?.data?.object) {
    console.error('Malformed checkout session event: missing data.object');
    return;
  }
  
  const session = event.data.object;
  
  // Handle missing required session fields
  if (!session.amount_total || !session.currency || !session.id) {
    console.error('Missing required fields in checkout session');
    return;
  }
  
  const sanitizedMetadata = sanitizeMetadata(session.metadata);
  
  if (!sanitizedMetadata) {
    console.error('No valid metadata found in checkout session');
    return;
  }
  
  const { campaignId, pledgeTierId, backerId } = sanitizedMetadata;
  
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
  // Handle missing or malformed event data
  if (!event?.data?.object?.id) {
    console.error('Malformed payment intent event: missing data.object.id');
    return;
  }
  
  const paymentIntent = event.data.object;
  
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
      // Handle missing email addresses gracefully
      if (updatedPledge.backer.email) {
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
      } else {
        console.warn(`⚠ No email address found for backer ${updatedPledge.backer.id}, skipping confirmation email`);
      }
    }
    
    console.log(`✓ Updated pledge status to captured for payment ${paymentIntent.id}`);
  }
}

async function handlePaymentIntentFailed(event: any) {
  // Handle missing or malformed event data
  if (!event?.data?.object?.id) {
    console.error('Malformed payment intent event: missing data.object.id');
    return;
  }
  
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

async function handlePaymentIntentCanceled(event: any) {
  // Handle missing or malformed event data
  if (!event?.data?.object?.id) {
    console.error('Malformed payment intent event: missing data.object.id');
    return;
  }
  
  const paymentIntent = event.data.object;
  
  // Update pledge status to failed for canceled payments
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
    console.log(`✓ Updated pledge status to failed for canceled payment ${paymentIntent.id}`);
  }
}