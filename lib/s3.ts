import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const region = process.env.AWS_REGION as string;
const bucket = process.env.S3_BUCKET as string;
const ttl = Number(process.env.S3_SIGNED_URL_TTL_SEC || "900");
export const s3 = new S3Client({ region });
export async function createUploadUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, cmd, { expiresIn: ttl });
  return { url, bucket, key };
}
