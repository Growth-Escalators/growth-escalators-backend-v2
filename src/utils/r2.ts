import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import crypto from 'crypto';

let _client: S3Client | null = null;

function getClient(): S3Client | null {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function uploadToR2(
  file: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const client = getClient();
  if (!client) throw new Error('R2 not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');

  const bucket = process.env.R2_BUCKET_NAME || 'ge-media';
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `${crypto.randomUUID()}-${Date.now()}.${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: file,
    ContentType: mimeType,
  }));

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${filename}`;
  return `https://${bucket}.r2.dev/${filename}`;
}

export async function deleteFromR2(filename: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  const bucket = process.env.R2_BUCKET_NAME || 'ge-media';
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filename }));
}

export interface R2Object {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  mimeType: string;
}

function inferMimeType(key: string): string {
  const ext = (key.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime',
    pdf: 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

export async function listR2Objects(): Promise<R2Object[]> {
  const client = getClient();
  if (!client) return [];
  const bucket = process.env.R2_BUCKET_NAME || 'ge-media';
  const publicUrl = process.env.R2_PUBLIC_URL || `https://${bucket}.r2.dev`;

  const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 500 }));
  return (result.Contents || []).map(obj => ({
    key: obj.Key || '',
    url: `${publicUrl}/${obj.Key}`,
    size: obj.Size || 0,
    lastModified: obj.LastModified?.toISOString() || '',
    mimeType: inferMimeType(obj.Key || ''),
  }));
}
