import { NextResponse } from "next/server";
import { createUploadUrl } from "@/lib/s3";
import crypto from "crypto";
export async function POST(req: Request) {
  const { fileName, contentType, campaignId } = await req.json();
  if (!fileName || !contentType || !campaignId)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const key = `campaigns/${campaignId}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
  const signed = await createUploadUrl(key, contentType);
  return NextResponse.json(signed);
}
