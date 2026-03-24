import { getDatabaseUrl, type RuntimeEnv } from '@monorepo/config';
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
}
