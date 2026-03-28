import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
}

export function getStorageConfig(env: Record<string, unknown>): StorageConfig {
  return {
    endpoint: String(env.S3_ENDPOINT ?? 'http://localhost:9000'),
    accessKey: String(env.S3_ACCESS_KEY ?? 'minioadmin'),
    secretKey: String(env.S3_SECRET_KEY ?? 'minioadmin'),
    bucket: String(env.S3_BUCKET ?? 'monorepo-uploads'),
    region: String(env.S3_REGION ?? 'us-east-1'),
  };
}

export function createStorageClient(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
}

/** Check if the bucket exists and is accessible. */
export async function verifyBucket(
  client: S3Client,
  bucket: string,
): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    return false;
  }
}

/** Generate a presigned PUT URL for uploading a file. */
export async function getUploadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/** Generate a presigned GET URL for downloading/viewing a file. */
export async function getDownloadUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/** Delete an object from storage. */
export async function deleteObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}
