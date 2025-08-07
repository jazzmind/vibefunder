import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';

export async function DELETE(
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
    await service.deleteImage(id, session.user.id);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Image deletion error:', error);
    
    if (error instanceof Error && error.message.includes('not found or access denied')) {
      return NextResponse.json({ 
        error: 'Image not found or access denied' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete image',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}