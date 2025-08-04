import { NextResponse } from "next/server";import { prisma } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const resolvedParams = await params;
  const item=await prisma.campaign.findUnique({where:{id:resolvedParams.id},include:{milestones:true}});
  if(!item)return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json(item);
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const resolvedParams = await params;
  const body=await req.json();
  const item=await prisma.campaign.update({where:{id:resolvedParams.id},data:body});
  return NextResponse.json(item);
}
