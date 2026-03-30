import {
  getApiDatabaseUrl,
  getApiPort,
  getAuthGrpcUrl,
  getBullMqPrefix,
  getMongoUrl,
  getProjectsQueueName,
  getRabbitMqUrl,
  getRedisUrl,
  getWebOrigin,
  isBullMqEnabled,
  isMongoEnabled,
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
      API_DATABASE_URL: this.configService.get<unknown>('API_DATABASE_URL'),
    };
  }

  getAuthGrpcRuntimeEnv(): RuntimeEnv {
    return {
      AUTH_GRPC_URL: this.configService.get<unknown>('AUTH_GRPC_URL'),
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
    return getApiDatabaseUrl(this.getDatabaseRuntimeEnv());
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

  getAuthGrpcUrl() {
    return getAuthGrpcUrl(this.getAuthGrpcRuntimeEnv());
  }

  getMongoRuntimeEnv(): RuntimeEnv {
    return {
      MONGO_URL: this.configService.get<unknown>('MONGO_URL'),
      MONGO_ENABLED: this.configService.get<unknown>('MONGO_ENABLED'),
    };
  }

  isMongoEnabled() {
    return isMongoEnabled(this.getMongoRuntimeEnv());
  }

  getMongoUrl() {
    return getMongoUrl(this.getMongoRuntimeEnv());
  }

  getMaskedMongoUrl() {
    return maskConnectionUrl(this.getMongoUrl());
  }
}
