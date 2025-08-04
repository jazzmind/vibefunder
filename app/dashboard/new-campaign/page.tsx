import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

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
    const budget = Number(formData.get("budget") || 0);
    const fundingGoal = Number(formData.get("fundingGoal") || 0);
    const deployModes = formData.getAll("deployModes") as string[];
    
    // Convert dollars to cents for storage
    const budgetDollars = Math.round(budget);
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
        budgetDollars,
        fundingGoalDollars,
        makerId: session.userId,
        status: "draft",
        deployModes: deployModes.length > 0 ? deployModes : ["saas"],
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    redirect(`/campaigns/${c.id}?new=true`);
  }
  
  return(
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Create Campaign</h1>
        <p className="text-gray-600 dark:text-gray-300">Launch your AI-native micro-SaaS project and connect with charter customers</p>
      </div>
      
      <form action={create} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Campaign Title
          </label>
          <input 
            id="title"
            name="title" 
            placeholder="e.g., ApplicationAI - URL to Application Processor" 
            required 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Summary
          </label>
          <textarea 
            id="summary"
            name="summary" 
            placeholder="Describe your project in one compelling sentence..." 
            required 
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Detailed Description
          </label>
          <textarea 
            id="description"
            name="description" 
            placeholder="Provide more details about your project, target users, and value proposition..." 
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fundingGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Funding Goal ($)
            </label>
            <input 
              id="fundingGoal"
              name="fundingGoal" 
              type="number" 
              step="1"
              placeholder="e.g., 50000" 
              required 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum funding needed to proceed</p>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Budget ($)
            </label>
            <input 
              id="budget"
              name="budget" 
              type="number" 
              step="1"
              placeholder="e.g., 100000" 
              required 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total project budget</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Deployment Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="saas" defaultChecked className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">SaaS (Cloud hosted)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="vpc" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">VPC (Private cloud)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" name="deployModes" value="onprem" className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">On-premises</span>
            </label>
          </div>
        </div>
        
        <button className="w-full btn py-3 text-base font-semibold" type="submit">
          Create Campaign
        </button>
      </form>
    </div>
  );
}