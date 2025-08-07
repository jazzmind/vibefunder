import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';
import { AIClient } from '@/lib/aiClient';
import { AIError } from '@/lib/aiService';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if AI and Blob storage are configured
    if (!AIClient.isConfigured()) {
      return NextResponse.json({ 
        error: 'AI service not configured. Please check your OpenAI API key.' 
      }, { status: 500 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ 
        error: 'Blob storage not configured. Please check your Vercel Blob token.' 
      }, { status: 500 });
    }

    const body = await request.json();
    
    // Add userId to the request
    const requestWithUser = {
      ...body,
      userId: session.user.id,
    };

    const service = new ImageLibraryService();
    const result = await service.generateAndStoreImage(requestWithUser);
    
    return NextResponse.json(result.data, {
      headers: {
        'X-AI-Execution-Time': result.metadata.executionTimeMs.toString(),
        'X-AI-Model': result.metadata.model || 'unknown',
        'X-AI-Retries': result.metadata.retries.toString(),
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
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
      error: 'Failed to generate image',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}