import {
  createStorageClient,
  deleteObject,
  getDownloadUrl,
  getStorageConfig,
  getUploadUrl,
} from '@monorepo/storage';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

const UPLOAD_EXPIRY = 600; // 10 minutes
const DOWNLOAD_EXPIRY = 86400; // 24 hours
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private client!: ReturnType<typeof createStorageClient>;
  private bucket!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const config = getStorageConfig({
      S3_ENDPOINT: this.configService.get<unknown>('S3_ENDPOINT'),
      S3_ACCESS_KEY: this.configService.get<unknown>('S3_ACCESS_KEY'),
      S3_SECRET_KEY: this.configService.get<unknown>('S3_SECRET_KEY'),
      S3_BUCKET: this.configService.get<unknown>('S3_BUCKET'),
      S3_REGION: this.configService.get<unknown>('S3_REGION'),
    });

    this.client = createStorageClient(config);
    this.bucket = config.bucket;
    this.logger.log(`Storage configured: ${config.endpoint}/${config.bucket}`);
  }

  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    contentType: string,
  ) {
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new Error(
        `Invalid content type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    const ext = filename.split('.').pop() ?? 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    const uploadUrl = await getUploadUrl(
      this.client,
      this.bucket,
      key,
      contentType,
      UPLOAD_EXPIRY,
    );

    return { uploadUrl, key, contentType, expiresIn: UPLOAD_EXPIRY };
  }

  async getPresignedDownloadUrl(key: string) {
    const url = await getDownloadUrl(
      this.client,
      this.bucket,
      key,
      DOWNLOAD_EXPIRY,
    );
    return { downloadUrl: url, key, expiresIn: DOWNLOAD_EXPIRY };
  }

  async delete(key: string) {
    await deleteObject(this.client, this.bucket, key);
  }
}
