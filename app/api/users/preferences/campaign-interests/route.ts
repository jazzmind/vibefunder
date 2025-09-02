import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { z } from 'zod';

const campaignInterestsSchema = z.object({
  categories: z.array(z.string()).optional(),
  subcategories: z.record(z.array(z.string())).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For now, return mock data as we don't have user preferences table yet
    const mockPreferences = {
      categories: ['technology', 'environment'],
      selectedCategories: ['technology', 'environment'],
      availableCategories: [
        'technology', 'environment', 'education', 'health', 
        'arts', 'sports', 'community', 'business'
      ]
    };

    return NextResponse.json(mockPreferences);
  } catch (error) {
    console.error('Get campaign interests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = campaignInterestsSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.errors.map(err => err.message);
      return NextResponse.json(
        { 
          success: false, 
          errors: errors.length > 0 ? errors : ['Validation failed']
        },
        { status: 400 }
      );
    }

    const { categories, subcategories } = result.data;
    
    // Validate categories against available ones
    const availableCategories = [
      'technology', 'environment', 'education', 'health', 
      'arts', 'sports', 'community', 'business'
    ];
    
    if (categories) {
      const invalidCategories = categories.filter(cat => !availableCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            errors: [`Invalid category: ${invalidCategories.join(', ')}`]
          },
          { status: 400 }
        );
      }
    }
    
    // Validate subcategories
    if (subcategories) {
      const errors = [];
      for (const [parent, subs] of Object.entries(subcategories)) {
        if (categories && !categories.includes(parent)) {
          errors.push(`Subcategory parent does not exist: ${parent}`);
        }
      }
      if (errors.length > 0) {
        return NextResponse.json(
          { success: false, errors },
          { status: 400 }
        );
      }
    }

    // For now, just return the data as we don't have user preferences table yet
    const updatedData = {
      categories: categories || [],
      subcategories: subcategories || {}
    };

    return NextResponse.json({
      success: true,
      message: 'Campaign interests updated successfully',
      data: updatedData
    });
  } catch (error) {
    console.error('Update campaign interests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}