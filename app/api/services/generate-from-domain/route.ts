import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import ServiceProviderGenerationService from "@/lib/services/ServiceProviderGenerationService";

const GenerateFromDomainSchema = z.object({
  domain: z.string().url("Valid domain URL is required"),
  userPrompt: z.string().optional(),
  autoCreate: z.boolean().default(false).describe("Whether to automatically create the service provider or just return the generated content")
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain, userPrompt, autoCreate } = GenerateFromDomainSchema.parse(body);

    console.log(`🔍 Generating service provider profile for domain: ${domain}`);
    
    // Generate service provider profile using AI
    const serviceProviderService = new ServiceProviderGenerationService();
    
    const generationResult = await serviceProviderService.generateServiceProvider({
      domain,
      userPrompt: userPrompt || ''
    });

    const generatedProvider = generationResult.data;

    // If autoCreate is true, create the service provider in the database
    if (autoCreate) {
      console.log(`📝 Auto-creating service provider: ${generatedProvider.name}`);
      
      // Note: This would require a Service Provider model in your schema
      // For now, we'll just return the generated content
      // You can add the database creation logic here when ready
      
      return NextResponse.json({
        success: true,
        message: "Service provider profile generated successfully",
        generated: generatedProvider,
        note: "Auto-creation feature requires Service Provider database model implementation"
      }, { status: 201 });
    }

    // Return generated content without creating service provider
    return NextResponse.json({
      success: true,
      generated: generatedProvider,
      domain: domain
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error generating service provider from domain:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to research company')) {
        return NextResponse.json({ 
          error: 'Unable to research company information. Please verify the domain is accessible and try again.'
        }, { status: 502 });
      }
      
      if (error.message.includes('Perplexity API')) {
        return NextResponse.json({ 
          error: 'External research service unavailable. Please try again later.'
        }, { status: 503 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}