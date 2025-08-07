import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new ImageLibraryService();
    await service.useImage(id);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Image use tracking error:', error);
    return NextResponse.json({ 
      error: 'Failed to track image usage',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}