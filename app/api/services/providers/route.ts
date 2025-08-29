import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Minimal Service Provider model is Organization with type=service_provider
const ProviderCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  website: z.string().url().optional(),
  shortDescription: z.string().min(10),
  domain: z.string().url().optional(),
  services: z.array(z.string()).min(1), // category ids
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = ProviderCreateSchema.parse(body);

    // Single org per owner (pending or approved)
    const existing = await prisma.organization.findFirst({
      where: { ownerId: session.user.id, status: { in: ['pending','approved'] }, type: 'service_provider' }
    });
    if (existing) return NextResponse.json({ error: 'You already have a provider profile', id: existing.id }, { status: 409 });

    const org = await prisma.organization.create({
      data: {
        ownerId: session.user.id,
        name: data.name,
        email: data.email,
        website: data.website,
        type: 'service_provider',
        shortDescription: data.shortDescription,
        status: 'pending',
      }
    });

    await prisma.organizationService.createMany({
      data: data.services.map(categoryId => ({ organizationId: org.id, categoryId, title: '' }))
    });

    return NextResponse.json({ success: true, organizationId: org.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst({ where: { ownerId: session.user.id, type: 'service_provider' } });
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: body.name ?? org.name,
        description: body.description ?? org.description,
        website: body.website ?? org.website,
        shortDescription: body.shortDescription ?? org.shortDescription,
      }
    });

    return NextResponse.json({ success: true, organization: { id: updated.id, name: updated.name, status: updated.status } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Request review/publish

