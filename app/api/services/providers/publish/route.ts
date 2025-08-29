import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const org = await prisma.organization.findFirst({ where: { ownerId: session.user.id, type: 'service_provider' } });
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await prisma.organization.update({ where: { id: org.id }, data: { status: 'pending' } });
    return NextResponse.json({ success: true, status: updated.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


