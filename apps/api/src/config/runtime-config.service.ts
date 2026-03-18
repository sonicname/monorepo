import {
  getApiPort,
  getBullMqPrefix,
  getDatabaseUrl,
  getProjectsQueueName,
  getRabbitMqUrl,
  getRedisUrl,
  getWebOrigin,
  isBullMqEnabled,
  isRabbitMqEnabled,
  maskConnectionUrl,
  type RuntimeEnv,
} from '@monorepo/config';
import { getBullMqConnection } from '@monorepo/queues/bullmq';
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

  getRabbitMqRuntimeEnv(): RuntimeEnv {
    return {
      RABBITMQ_URL: this.configService.get<unknown>('RABBITMQ_URL'),
      RABBITMQ_ENABLED: this.configService.get<unknown>('RABBITMQ_ENABLED'),
    };
  }

  getDatabaseRuntimeEnv(): RuntimeEnv {
    return {
      DATABASE_URL: this.configService.get<unknown>('DATABASE_URL'),
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

  getDatabaseUrl() {
    return getDatabaseUrl(this.getDatabaseRuntimeEnv());
  }

  getRabbitMqUrl() {
    return getRabbitMqUrl(this.getRabbitMqRuntimeEnv());
  }

  isRabbitMqEnabled() {
    return isRabbitMqEnabled(this.getRabbitMqRuntimeEnv());
  }

  getBullMqConnection() {
    return getBullMqConnection(this.getBullMqRuntimeEnv());
  }

  getMaskedBullMqConnectionUrl() {
    return maskConnectionUrl(this.getBullMqConnectionUrl());
  }

  getMaskedRabbitMqConnectionUrl() {
    return maskConnectionUrl(this.getRabbitMqUrl());
  }

  getProjectsQueueName() {
    return getProjectsQueueName(this.getBullMqRuntimeEnv());
  }
}
