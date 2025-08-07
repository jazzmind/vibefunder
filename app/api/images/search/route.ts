import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const searchInput = {
      userId: session.user.id,
      organizationId: searchParams.get('organizationId') || undefined,
      theme: searchParams.get('theme') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
      includePublic: searchParams.get('includePublic') !== 'false',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const service = new ImageLibraryService();
    const result = await service.searchImages(searchInput);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search images',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}