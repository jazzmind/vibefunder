import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import GitHubService from "@/lib/services/GitHubService";
import CampaignGenerationService from "@/lib/services/CampaignGenerationService";

const GenerateFromRepoSchema = z.object({
  repoUrl: z.string().url("Valid repository URL is required"),
  userPrompt: z.string().optional(),
  autoCreate: z.boolean().default(false).describe("Whether to automatically create the campaign or just return the generated content")
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error(`[Campaign Generation] User not found in database: ${session.user.id}`);
      
      // If in LOCAL_API mode and user doesn't exist, create them
      if (process.env.LOCAL_API === 'true' && session.user.email) {
        console.log(`[Campaign Generation] Creating user for LOCAL_API mode: ${session.user.email}`);
        const newUser = await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.email.split('@')[0],
            roles: session.user.roles || []
          }
        });
        console.log(`[Campaign Generation] Created user: ${newUser.id}`);
      } else {
        return NextResponse.json({ 
          error: 'User not found in database. Please log in again.',
          details: 'Session contains invalid user ID' 
        }, { status: 403 });
      }
    }

    const body = await req.json();
    const { repoUrl, userPrompt, autoCreate } = GenerateFromRepoSchema.parse(body);

    // Get user's GitHub connection
    const githubConnection = await prisma.gitHubConnection.findUnique({
      where: { userId: session.user.id }
    });

    // Initialize GitHub service with token if available
    const githubService = new GitHubService(githubConnection?.githubToken);
    
    // Extract repository content
    console.log(`🔍 Extracting content from repository: ${repoUrl}`);
    const repoContent = await githubService.extractRepositoryContent(repoUrl);
    
    if (!repoContent.hasDocumentation) {
      return NextResponse.json({ 
        error: 'Repository has no README or documentation to generate campaign from',
        suggestion: 'Add a README.md file to your repository with project description'
      }, { status: 400 });
    }

    // Generate campaign content using AI
    console.log(`🤖 Generating campaign content for: ${repoContent.repository.name}`);
    const campaignGenerationService = new CampaignGenerationService();
    
    const generationResult = await campaignGenerationService.generateCampaign({
      repository: repoContent.repository,
      readmeContent: repoContent.readmeContent,
      docsContent: repoContent.docsContent,
      userPrompt: userPrompt || ''
    });

    const generatedCampaign = generationResult.data;

    // If autoCreate is true, create the campaign in the database
    if (autoCreate) {
      console.log(`📝 Auto-creating campaign: ${generatedCampaign.title}`);
      
      const campaign = await prisma.campaign.create({
        data: {
          makerId: session.user.id,
          title: generatedCampaign.title,
          summary: generatedCampaign.summary,
          description: generatedCampaign.description,
          fundingGoalDollars: generatedCampaign.fundingGoalDollars,
          repoUrl: repoUrl,
          sectors: generatedCampaign.sectors,
          deployModes: generatedCampaign.deployModes,
          status: 'draft'
        },
        include: {
          maker: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Create milestones
      const milestones = await Promise.all(
        generatedCampaign.milestones.map(milestone => 
          prisma.milestone.create({
            data: {
              campaignId: campaign.id,
              name: milestone.name,
              pct: milestone.pct,
              acceptance: milestone.acceptance
            }
          })
        )
      );

      // Create pledge tiers
      const pledgeTiers = await Promise.all(
        generatedCampaign.pledgeTiers.map(tier => 
          prisma.pledgeTier.create({
            data: {
              campaignId: campaign.id,
              title: tier.title,
              description: tier.description,
              amountDollars: tier.amountDollars,
              order: tier.order
            }
          })
        )
      );

      return NextResponse.json({
        success: true,
        campaign: {
          ...campaign,
          milestones,
          pledgeTiers
        },
        generated: generatedCampaign,
        repository: repoContent.repository
      }, { status: 201 });
    }

    // Return generated content without creating campaign
    return NextResponse.json({
      success: true,
      generated: generatedCampaign,
      repository: repoContent.repository,
      hasDocumentation: repoContent.hasDocumentation
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error generating campaign from repository:', error);
    
    // Handle specific GitHub errors
    if (error instanceof Error) {
      if (error.message.includes('Repository not found')) {
        return NextResponse.json({ 
          error: 'Repository not found or not accessible. Please check the URL and ensure the repository is public or you have access.'
        }, { status: 404 });
      }
      
      if (error.message.includes('GitHub API error')) {
        return NextResponse.json({ 
          error: 'GitHub API error. Please try again later or check your GitHub token.'
        }, { status: 502 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}