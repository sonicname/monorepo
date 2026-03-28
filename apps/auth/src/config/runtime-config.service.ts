import {
  getAuthDatabaseUrl,
  getAuthGrpcPort,
  getRedisUrl,
  type RuntimeEnv,
} from '@monorepo/config';
import type { ConnectionOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_AUTH_PORT = 3002;

@Injectable()
export class RuntimeConfigService {
  constructor(private readonly configService: ConfigService) {}

  getDatabaseRuntimeEnv(): RuntimeEnv {
    return {
      AUTH_DATABASE_URL: this.configService.get<unknown>('AUTH_DATABASE_URL'),
    };
  }

  getDatabaseUrl() {
    return getAuthDatabaseUrl(this.getDatabaseRuntimeEnv());
  }

  getAuthPort(): number {
    return this.configService.get<number>('AUTH_PORT') ?? DEFAULT_AUTH_PORT;
  }

  getJwtSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') ?? 'change-me-in-production'
    );
  }

  getGrpcRuntimeEnv(): RuntimeEnv {
    return {
      AUTH_GRPC_PORT: this.configService.get<unknown>('AUTH_GRPC_PORT'),
    };
  }

  getAuthGrpcPort(): number {
    return getAuthGrpcPort(this.getGrpcRuntimeEnv());
  }

  getAuthGrpcBindUrl(): string {
    return `0.0.0.0:${this.getAuthGrpcPort()}`;
  }

  getRedisRuntimeEnv(): RuntimeEnv {
    return {
      REDIS_URL: this.configService.get<unknown>('REDIS_URL'),
    };
  }

  getRedisUrl(): string {
    return getRedisUrl(this.getRedisRuntimeEnv());
  }

  getBullMqConnection(): ConnectionOptions {
    const url = new URL(this.getRedisUrl());
    const usesTls = url.protocol === 'rediss:';
    const dbPath = url.pathname.replace('/', '');
    const db = dbPath ? Number(dbPath) : undefined;

    return {
      host: url.hostname,
      port: Number(url.port || (usesTls ? 6380 : 6379)),
      username: url.username || undefined,
      password: url.password || undefined,
      db: Number.isInteger(db) ? db : undefined,
      tls: usesTls ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }
}
