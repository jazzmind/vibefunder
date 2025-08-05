import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ContentEnhancementService } from '@/lib/services/ContentEnhancementService';
import { AIClient } from '@/lib/aiClient';
import { AIError } from '@/lib/aiService';

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
    const service = new ContentEnhancementService();
    
    const result = await service.enhanceContent(body);
    
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