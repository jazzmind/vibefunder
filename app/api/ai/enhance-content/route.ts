import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ContentEnhancementService } from '@/lib/services/ContentEnhancementService';
import GitHubService from '@/lib/services/GitHubService';
import ServiceProviderGenerationService from '@/lib/services/ServiceProviderGenerationService';
import { prisma } from '@/lib/db';
import { AIClient } from '@/lib/ai/aiClient';
import { AIError } from '@/lib/ai/aiService';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if AI is configured
    if (!AIClient.isConfigured()) {
      return NextResponse.json({ 
        error: 'AI service not configured. Please check your OpenAI API key.' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { title, summary, content, repoUrl, websiteUrl } = body || {};

    // Build optional context from repo and website
    let repoContext: string | undefined;
    let websiteContext: string | undefined;

    try {
      if (repoUrl) {
        // Use user's GitHub connection token if present
        const connection = await prisma.gitHubConnection.findUnique({ where: { userId: session.user.id } });
        const gh = new GitHubService(connection?.githubToken);
        const repo = await gh.extractRepositoryContent(repoUrl);
        if (repo?.readmeContent || repo?.docsContent) {
          // Limit context length to avoid prompt bloat
          const text = `${repo.readmeContent || ''}\n\n${repo.docsContent || ''}`.slice(0, 8000);
          repoContext = text;
        }
      }
    } catch (e) {
      console.warn('enhance-content repo context error:', e);
    }

    try {
      if (websiteUrl) {
        const svc = new ServiceProviderGenerationService();
        const gen = await svc.generateServiceProvider({ domain: websiteUrl, userPrompt: '' });
        const ctxParts: string[] = [];
        if (gen.data?.description) ctxParts.push(gen.data.description);
        if (gen.data?.valueProposition) ctxParts.push(gen.data.valueProposition);
        if (Array.isArray(gen.data?.services)) ctxParts.push(`Services: ${gen.data.services.join(', ')}`);
        websiteContext = ctxParts.join('\n').slice(0, 4000);
      }
    } catch (e) {
      console.warn('enhance-content website context error:', e);
    }

    const service = new ContentEnhancementService();
    const result = await service.enhanceContent({ title, summary, content, repoContext, websiteContext });
    
    return NextResponse.json(result.data, {
      headers: {
        'X-AI-Execution-Time': result.metadata.executionTimeMs.toString(),
        'X-AI-Model': result.metadata.model || 'unknown',
        'X-AI-Retries': result.metadata.retries.toString(),
      }
    });

  } catch (error) {
    console.error('Content enhancement error:', error);
    
    if (error instanceof AIError) {
      const statusCode = error.type === 'validation' ? 400 : 
                        error.type === 'rate_limit' ? 429 : 500;
      
      return NextResponse.json({ 
        error: error.message,
        type: error.type,
        retryable: error.retryable 
      }, { status: statusCode });
    }
    
    return NextResponse.json({ 
      error: 'Failed to enhance content',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}