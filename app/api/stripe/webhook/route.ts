import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendPledgeConfirmationEmail } from "@/lib/email";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const sig = (req.headers.get("stripe-signature") || "") as string;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  const raw = (await (req as any).text?.()) || "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const pi = session.payment_intent;
    if (pi) {
      const intent = await stripe.paymentIntents.retrieve(
        typeof pi === "string" ? pi : pi.id
      );
      const pledgeId = intent.metadata?.pledgeId;
      if (pledgeId) {
        // Update pledge status
        const pledge = await prisma.pledge.update({
          where: { id: pledgeId },
          data: { status: "captured", paymentRef: intent.id },
          include: {
            backer: true,
            campaign: true
          }
        });
        
        // Send confirmation email
        try {
          await sendPledgeConfirmationEmail(pledge.backer.email, {
            campaignTitle: pledge.campaign.title,
            campaignId: pledge.campaign.id,
            pledgeAmount: pledge.amountDollars,
            backerName: pledge.backer.name || undefined
          });
          console.log(`✓ Sent pledge confirmation email to ${pledge.backer.email}`);
        } catch (error) {
          console.error('Failed to send pledge confirmation email:', error);
          // Don't fail the webhook for email issues
        }
      }
    }
  }
  return NextResponse.json({ received: true });
}
