import { getDatabaseUrl, getAuthGrpcPort, type RuntimeEnv } from '@monorepo/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_AUTH_PORT = 3002;

@Injectable()
export class RuntimeConfigService {
  constructor(private readonly configService: ConfigService) {}

  getDatabaseRuntimeEnv(): RuntimeEnv {
    return {
      DATABASE_URL: this.configService.get<unknown>('DATABASE_URL'),
    };
  }

  getDatabaseUrl() {
    return getDatabaseUrl(this.getDatabaseRuntimeEnv());
  }

  getAuthPort(): number {
    return (
      this.configService.get<number>('AUTH_PORT') ?? DEFAULT_AUTH_PORT
    );
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
}
