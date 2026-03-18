import {
  PROJECTS_RABBITMQ_PATTERN,
  PROJECTS_RABBITMQ_QUEUE_NAME,
} from '@monorepo/constants';
import type { RabbitMqStatus } from '@monorepo/contracts';
import { Injectable } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class RabbitMqService {
  private readonly status: RabbitMqStatus;

  constructor(private readonly runtimeConfigService: RuntimeConfigService) {
    const enabled = runtimeConfigService.isRabbitMqEnabled();

    this.status = {
      enabled,
      url: runtimeConfigService.getMaskedRabbitMqConnectionUrl(),
      connected: false,
      queueName: PROJECTS_RABBITMQ_QUEUE_NAME,
      pattern: PROJECTS_RABBITMQ_PATTERN,
      consumerTag: null,
      lastPublishedAt: null,
      lastMessageAt: null,
      lastError: null,
    };
  }

  getStatus(): RabbitMqStatus {
    return this.status;
  }

  isEnabled(): boolean {
    return this.status.enabled;
  }

  markConnected() {
    this.status.connected = true;
    this.status.lastError = null;
  }

  markConsumerReady(consumerTag: string) {
    this.status.consumerTag = consumerTag;
    this.status.lastError = null;
  }

  markPublished(publishedAt: string) {
    this.status.lastPublishedAt = publishedAt;
    this.status.lastError = null;
  }

  markMessageProcessed(processedAt: string) {
    this.status.lastMessageAt = processedAt;
    this.status.lastError = null;
  }

  markConsumerError(error: unknown) {
    this.status.lastError =
      error instanceof Error ? error.message : String(error);
  }

  markDisconnected() {
    this.status.connected = false;
    this.status.consumerTag = null;
  }
}
