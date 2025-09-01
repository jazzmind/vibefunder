import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { z } from 'zod';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

const preferencesUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    marketing: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    profilePublic: z.boolean().optional(),
    showEmail: z.boolean().optional(),
    allowMessages: z.boolean().optional(),
    showActivity: z.boolean().optional()
  }).optional(),
  campaignDefaults: z.object({
    currency: z.string().optional(),
    category: z.string().optional(),
    fundingGoalMin: z.number().optional(),
    fundingGoalMax: z.number().optional()
  }).optional()
});

async function getUserFromToken(request: NextRequest) {
  let token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    const cookieToken = request.cookies.get('session')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    return userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to get existing preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          notifications: {
            email: true,
            push: true,
            sms: false,
            marketing: false
          },
          privacy: {
            profilePublic: true,
            showEmail: false,
            allowMessages: true,
            showActivity: true
          },
          campaignDefaults: {
            currency: 'USD',
            category: 'technology'
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        id: preferences.id,
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        currency: preferences.currency,
        notifications: preferences.notifications,
        privacy: preferences.privacy,
        campaignDefaults: preferences.campaignDefaults,
        updatedAt: preferences.updatedAt
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = preferencesUpdateSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Update or create preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        theme: updateData.theme || 'system',
        language: updateData.language || 'en',
        timezone: updateData.timezone || 'UTC',
        currency: updateData.currency || 'USD',
        notifications: updateData.notifications || {
          email: true,
          push: true,
          sms: false,
          marketing: false
        },
        privacy: updateData.privacy || {
          profilePublic: true,
          showEmail: false,
          allowMessages: true,
          showActivity: true
        },
        campaignDefaults: updateData.campaignDefaults || {
          currency: 'USD',
          category: 'technology'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        id: preferences.id,
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        currency: preferences.currency,
        notifications: preferences.notifications,
        privacy: preferences.privacy,
        campaignDefaults: preferences.campaignDefaults,
        updatedAt: preferences.updatedAt
      }
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}