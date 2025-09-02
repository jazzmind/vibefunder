import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  STRIPE_CURRENCY,
  STRIPE_PRICE_DOLLARS,
  STRIPE_APP_FEE_BPS,
  DEST_ACCOUNT,
} from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const checkoutSessionSchema = z.object({
  campaignId: z.string(),
  pledgeTierId: z.string().optional(),
  pledgeAmount: z.number()
    .min(100, "Minimum payment amount is $100") // Minimum $100
    .max(1000000, "Maximum payment amount is $1,000,000") // Maximum $1,000,000
    .finite("Payment amount must be a finite number") // Reject Infinity and NaN
    .refine((val) => val > 0, "Payment amount must be positive")
    .refine((val) => Number.isFinite(val), "Payment amount must be a valid number")
    .refine((val) => {
      // Allow reasonable precision (up to 3 decimal places for fractional cents)
      const str = val.toString();
      const decimalIndex = str.indexOf('.');
      return decimalIndex === -1 || str.length - decimalIndex - 1 <= 3;
    }, "Payment amount has too many decimal places"),
  backerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    // Handle empty or invalid JSON bodies
    let body;
    try {
      body = await req.json();
      
      // Check if body is empty or null
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ 
          error: 'Invalid JSON in request body' 
        }, { status: 400 });
      }
    } catch (jsonError) {
      // This catches both SyntaxError and other JSON parsing errors
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const validatedData = checkoutSessionSchema.parse(body);
    
    const { campaignId, pledgeTierId, pledgeAmount, backerEmail, successUrl, cancelUrl } = validatedData;
    
    // Get campaign with pledge tiers
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { pledgeTiers: true }
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    // Check campaign status
    if (campaign.status !== 'published') {
      return NextResponse.json({ error: "Campaign is not accepting pledges" }, { status: 400 });
    }
    
    // Validate pledge tier if specified
    let pledgeTier = null;
    if (pledgeTierId) {
      pledgeTier = campaign.pledgeTiers.find(tier => tier.id === pledgeTierId);
      if (!pledgeTier) {
        return NextResponse.json({ error: "Pledge tier not found" }, { status: 404 });
      }
      if (!pledgeTier.isActive) {
        return NextResponse.json({ error: "Pledge tier is not active" }, { status: 400 });
      }
    }
    
    // Use authenticated user email or provided email
    const customerEmail = session?.user?.email || backerEmail;
    if (!customerEmail) {
      return NextResponse.json({ error: "Email is required for checkout" }, { status: 400 });
    }
    
    // Create or get backer user
    const backer = await prisma.user.upsert({
      where: { email: customerEmail },
      update: {},
      create: {
        email: customerEmail,
        name: customerEmail.split('@')[0],
        roles: ['backer']
      }
    });
    
    // Calculate amounts
    const amountCents = Math.round(pledgeAmount * 100);
    const appFeeCents = Math.round(amountCents * STRIPE_APP_FEE_BPS / 10000);
    
    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: STRIPE_CURRENCY,
              product_data: {
                name: `Pledge to ${campaign.title}`,
                description: pledgeTier ? `${pledgeTier.title} - ${pledgeTier.description}` : 'Campaign pledge',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: appFeeCents,
          transfer_data: {
            destination: DEST_ACCOUNT,
          },
          metadata: {
            campaignId,
            pledgeTierId: pledgeTierId || '',
            backerId: backer.id,
            pledgeAmount: pledgeAmount.toString()
          }
        },
        success_url: successUrl || `${req.nextUrl.origin}/campaigns/${campaignId}?payment=success`,
        cancel_url: cancelUrl || `${req.nextUrl.origin}/campaigns/${campaignId}?payment=cancelled`,
        metadata: {
          campaignId,
          pledgeTierId: pledgeTierId || '',
          backerId: backer.id
        }
      });
      
      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id
      });
    } catch (stripeError) {
      console.error('Stripe checkout session creation failed:', stripeError);
      return NextResponse.json({ 
        error: "Failed to create checkout session" 
      }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Checkout session error:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}