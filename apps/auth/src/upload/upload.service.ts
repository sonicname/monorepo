import {
  createStorageClient,
  deleteObject,
  getDownloadUrl,
  getStorageConfig,
  getUploadUrl,
} from '@monorepo/storage';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const AVATAR_MAX_SIZE_LABEL = '2MB';
const AVATAR_UPLOAD_EXPIRY = 600; // 10 minutes
const AVATAR_DOWNLOAD_EXPIRY = 86400; // 24 hours
const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
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

  async getAvatarUploadUrl(userId: string, contentType: string) {
    if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
      throw new Error(
        `Invalid content type. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`,
      );
    }

    const ext = contentType.split('/')[1];
    const key = `avatars/${userId}.${ext}`;

    const uploadUrl = await getUploadUrl(
      this.client,
      this.bucket,
      key,
      contentType,
      AVATAR_UPLOAD_EXPIRY,
    );

    return {
      uploadUrl,
      key,
      contentType,
      maxSize: AVATAR_MAX_SIZE_LABEL,
      expiresIn: AVATAR_UPLOAD_EXPIRY,
    };
  }

  async getAvatarDownloadUrl(key: string) {
    return getDownloadUrl(this.client, this.bucket, key, AVATAR_DOWNLOAD_EXPIRY);
  }

  async deleteAvatar(key: string) {
    await deleteObject(this.client, this.bucket, key);
  }
}
