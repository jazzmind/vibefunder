import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function POST(req: Request) {
  const body = await req.json();
  const m = await prisma.milestone.create({ data: body });
  return NextResponse.json(m, { status: 201 });
}
