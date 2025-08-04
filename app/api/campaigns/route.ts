import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function GET() {
  const items = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}
export async function POST(req: Request) {
  const body = await req.json();
  const maker = await prisma.user.findFirst({
    where: { email: "founder@demo.dev" },
  });
  const item = await prisma.campaign.create({
    data: { ...body, makerId: maker!.id },
  });
  return NextResponse.json(item, { status: 201 });
}
