/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  PROJECTS_RABBITMQ_PATTERN,
  PROJECTS_RABBITMQ_QUEUE_NAME,
  type ProjectsSyncJobData,
} from '@monorepo/constants';
import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RuntimeConfigService } from '../config/runtime-config.service';
import type { ProjectsService } from '../projects/projects.service';
import { RabbitMqService } from './rabbitmq.service';

@Injectable()
export class RabbitMqPublisherService
  implements OnModuleInit, OnApplicationShutdown
{
  private client: ClientProxy | null = null;

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly runtimeConfigService: RuntimeConfigService,
  ) {}

  async onModuleInit() {
    if (!this.rabbitMqService.isEnabled()) {
      return;
    }

    const client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [this.runtimeConfigService.getRabbitMqUrl()],
        queue: PROJECTS_RABBITMQ_QUEUE_NAME,
        queueOptions: {
          durable: true,
        },
      },
    });

    await client.connect();
    this.client = client;
    this.rabbitMqService.markConnected();
  }

  async publishProjectsSync(data: ProjectsSyncJobData) {
    if (!this.rabbitMqService.isEnabled()) {
      throw new Error(
        'RabbitMQ is disabled. Set RABBITMQ_URL or RABBITMQ_ENABLED=true to enable it.',
      );
    }

    if (!this.client) {
      throw new Error('RabbitMQ client is not available.');
    }

    const result = await firstValueFrom(
      this.client.send(PROJECTS_RABBITMQ_PATTERN, data),
    );

    this.rabbitMqService.markPublished(new Date().toISOString());

    return result as Awaited<
      ReturnType<ProjectsService['handleRabbitMqProjectsSync']>
    >;
  }

  async onApplicationShutdown() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    this.rabbitMqService.markDisconnected();
  }
}
