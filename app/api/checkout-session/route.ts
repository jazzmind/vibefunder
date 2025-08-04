import { NextResponse } from "next/server";
import {
  stripe,
  STRIPE_CURRENCY,
  STRIPE_PRICE_DOLLARS,
  STRIPE_APP_FEE_BPS,
  DEST_ACCOUNT,
} from "@/lib/stripe";
import { prisma } from "@/lib/db";
export async function POST(req: Request) {
  const { campaignId, backerEmail, pledgeAmount } = await req.json();
  
  // Validate pledge amount
  const requestedAmount = pledgeAmount || Number(process.env.STRIPE_PRICE_DOLLARS || STRIPE_PRICE_DOLLARS);
  if (requestedAmount < 100) {
    return NextResponse.json({ error: "Minimum pledge amount is $100" }, { status: 400 });
  }
  
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    
  if (campaign.status !== 'live') {
    return NextResponse.json({ error: "Campaign is not accepting pledges" }, { status: 400 });
  }
    
  const backer = await prisma.user.upsert({
    where: { email: backerEmail || "backer@demo.dev" },
    update: {},
    create: { email: backerEmail || "backer@demo.dev", roles: ["backer"] },
  });
  
  const amount = Math.round(requestedAmount * 100); // Convert to cents for Stripe
  const appFee = Math.floor(amount * (STRIPE_APP_FEE_BPS / 10000));
  const pledge = await prisma.pledge.create({
    data: {
      campaignId,
      backerId: backer.id,
      amountDollars: requestedAmount, // Store in dollars, not cents
      status: "authorized",
    },
  });
  const params: any = {
    mode: "payment",
    payment_intent_data: {
      metadata: { pledgeId: pledge.id, campaignId },
      capture_method: "automatic",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: STRIPE_CURRENCY,
          product_data: { name: `Pledge for ${campaign.title}` },
          unit_amount: amount,
        },
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/campaigns/${campaignId}?pledge=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/campaigns/${campaignId}?pledge=cancel`,
  };
  if (DEST_ACCOUNT) {
    params.payment_intent_data.application_fee_amount = appFee;
    params.payment_intent_data.transfer_data = { destination: DEST_ACCOUNT };
  }
  const session = await stripe.checkout.sessions.create(params);
  return NextResponse.json({ id: session.id, url: session.url });
}
