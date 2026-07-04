import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { awsConfig } from '../config/aws.config.js';
import { env } from '../config/env.config.js';
import { ApiError } from '../utils/api-error.js';

const s3Client = new S3Client(awsConfig);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function requireBucketName(): string {
  const bucket = env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new ApiError(500, 'S3_BUCKET_NAME is not configured');
  }
  return bucket;
}

function getRegion(): string {
  return env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-1';
}

function sanitizeFileExtension(extension: string): string {
  const clean = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return 'bin';
  if (clean === 'jpeg') return 'jpg';
  return clean;
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'bin';
}

function extensionFromMimeOrName(mimeType: string, originalName?: string): string {
  const fromMime = sanitizeFileExtension(mimeToExt(mimeType.toLowerCase()));
  if (fromMime !== 'bin') return fromMime;
  if (!originalName) return 'bin';
  const name = originalName.toLowerCase();
  if (name.endsWith('.mp3')) return 'mp3';
  if (name.endsWith('.wav')) return 'wav';
  if (name.endsWith('.m4a')) return 'm4a';
  if (name.endsWith('.ogg')) return 'ogg';
  if (name.endsWith('.webm')) return 'webm';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'bin';
}

type ParsedDataUrl = {
  mimeType: string;
  buffer: Buffer;
};

function parseImageDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeTypeRaw = match[1];
  const base64Payload = match[2];
  if (!mimeTypeRaw || !base64Payload) {
    return null;
  }
  const mimeType = mimeTypeRaw.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, `Unsupported image format: ${mimeType}`);
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (buffer.length === 0) {
    throw new ApiError(400, 'Image payload is empty');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, `Image exceeds max size ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB`);
  }

  return { mimeType, buffer };
}

function toPublicUrl(bucket: string, key: string): string {
  const region = getRegion();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function normalizeFarmerId(farmerId: string): string {
  return farmerId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function uploadImage(fileBuffer: Buffer, farmerId: string, mimeType = 'image/jpeg'): Promise<{ key: string; url: string }> {
  const bucket = requireBucketName();
  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new ApiError(400, `Unsupported image format: ${normalizedMime}`);
  }
  if (fileBuffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, `Image exceeds max size ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB`);
  }

  const ext = sanitizeFileExtension(mimeToExt(normalizedMime));
  const key = `farmers/${normalizeFarmerId(farmerId)}/${randomUUID()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: normalizedMime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return { key, url: toPublicUrl(bucket, key) };
}

export async function uploadComplaintAttachment(
  fileBuffer: Buffer,
  farmerId: string,
  mimeType: string,
  originalName?: string,
): Promise<{ key: string; url: string }> {
  const bucket = requireBucketName();
  const normalizedMime = mimeType.toLowerCase();
  if (!normalizedMime.startsWith('image/') && !normalizedMime.startsWith('audio/')) {
    throw new ApiError(400, 'Only image/audio attachments are supported');
  }
  if (fileBuffer.length === 0) {
    throw new ApiError(400, 'Attachment payload is empty');
  }
  if (fileBuffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, `Attachment exceeds max size ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB`);
  }

  const ext = extensionFromMimeOrName(normalizedMime, originalName);
  const key = `complaints/${normalizeFarmerId(farmerId)}/${randomUUID()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: normalizedMime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return { key, url: toPublicUrl(bucket, key) };
}

export async function deleteImage(imageKey: string): Promise<void> {
  const bucket = requireBucketName();
  if (!imageKey) return;

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: imageKey,
    }),
  );
}

export function getS3KeyFromUrl(imageUrl: string): string | null {
  if (!imageUrl) return null;
  try {
    const bucket = requireBucketName();
    const parsed = new URL(imageUrl);
    const host = parsed.host.toLowerCase();
    if (!host.startsWith(`${bucket.toLowerCase()}.s3.`)) {
      return null;
    }
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

async function uploadDataUrl(dataUrl: string, farmerId: string): Promise<string> {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) {
    throw new ApiError(400, 'Invalid image format. Expected image URL or base64 data URL.');
  }
  const uploaded = await uploadImage(parsed.buffer, farmerId, parsed.mimeType);
  return uploaded.url;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function normalizeListingImagesForStorage(images: string[], farmerId: string): Promise<string[]> {
  const unique = [...new Set((images ?? []).map((img) => img.trim()).filter(Boolean))].slice(0, 6);
  const uploaded: string[] = [];

  for (const image of unique) {
    if (isHttpUrl(image)) {
      uploaded.push(image);
      continue;
    }
    if (image.startsWith('/uploads/')) {
      // Keep old local paths untouched to avoid breaking existing rows.
      uploaded.push(image);
      continue;
    }
    uploaded.push(await uploadDataUrl(image, farmerId));
  }
  return uploaded;
}

export async function deleteRemovedS3Images(previousImages: string[], nextImages: string[]): Promise<void> {
  const nextSet = new Set(nextImages);
  const removals = previousImages.filter((url) => !nextSet.has(url));

  await Promise.all(
    removals.map(async (url) => {
      const key = getS3KeyFromUrl(url);
      if (!key) return;
      await deleteImage(key);
    }),
  );
}

export async function deleteListingImages(images: string[]): Promise<void> {
  await Promise.all(
    (images ?? []).map(async (url) => {
      const key = getS3KeyFromUrl(url);
      if (!key) return;
      await deleteImage(key);
    }),
  );
}
