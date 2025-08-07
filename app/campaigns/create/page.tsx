import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import CampaignCreationWizard from "./CampaignCreationWizard";

export default async function NewCampaign(){
  // Check authentication
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  
  if (!session) {
    redirect('/signin');
  }

  async function create(formData:FormData){
    "use server";
    const title = formData.get("title") as string;
    const summary = formData.get("summary") as string;
    const description = formData.get("description") as string;
    const fundingGoal = Number(formData.get("fundingGoal") || 0);
    const deployModes = formData.getAll("deployModes") as string[];
    const sectors = formData.getAll("sectors") as string[];
    
    // Convert dollars for storage
    const fundingGoalDollars = Math.round(fundingGoal);
    
    // Get current user from session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;
    
    if (!session) {
      redirect('/signin');
    }
    
    const c = await prisma.campaign.create({
      data: {
        title,
        summary,
        description: "No description provided",
  
        fundingGoalDollars,
        makerId: session.userId,
        status: "draft",
        deployModes: deployModes.length > 0 ? deployModes : ["saas"],
        sectors: sectors.length > 0 ? sectors : [],
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    redirect(`/campaigns/${c.id}?new=true`);
  }
  
  return <CampaignCreationWizard createManualCampaign={create} session={session} />;
}