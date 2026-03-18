import {
  getApiPort,
  getBullMqPrefix,
  getProjectsQueueName,
  getRedisUrl,
  getWebOrigin,
  isBullMqEnabled,
  maskConnectionUrl,
  type RuntimeEnv,
} from '@monorepo/config';
import { getBullMqConnection } from '@monorepo/queue';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RuntimeConfigService {
  constructor(private readonly configService: ConfigService) {}

  getHttpRuntimeEnv(): RuntimeEnv {
    return {
      PORT: this.configService.get<unknown>('PORT'),
      API_PORT: this.configService.get<unknown>('API_PORT'),
      WEB_PORT: this.configService.get<unknown>('WEB_PORT'),
      WEB_URL: this.configService.get<unknown>('WEB_URL'),
    };
  }

  getBullMqRuntimeEnv(): RuntimeEnv {
    return {
      REDIS_URL: this.configService.get<unknown>('REDIS_URL'),
      BULLMQ_ENABLED: this.configService.get<unknown>('BULLMQ_ENABLED'),
      BULLMQ_PREFIX: this.configService.get<unknown>('BULLMQ_PREFIX'),
    };
  }

  getApiPort() {
    return getApiPort(this.getHttpRuntimeEnv());
  }

  getWebOrigin() {
    return getWebOrigin(this.getHttpRuntimeEnv());
  }

  isBullMqEnabled() {
    return isBullMqEnabled(this.getBullMqRuntimeEnv());
  }

  getBullMqPrefix() {
    return getBullMqPrefix(this.getBullMqRuntimeEnv());
  }

  getBullMqConnectionUrl() {
    return getRedisUrl(this.getBullMqRuntimeEnv());
  }

  getBullMqConnection() {
    return getBullMqConnection(this.getBullMqRuntimeEnv());
  }

  getMaskedBullMqConnectionUrl() {
    return maskConnectionUrl(this.getBullMqConnectionUrl());
  }

  getProjectsQueueName() {
    return getProjectsQueueName(this.getBullMqRuntimeEnv());
  }
}
