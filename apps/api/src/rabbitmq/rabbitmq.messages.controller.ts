import type { ProjectsSyncJobData } from '@monorepo/constants';
import { PROJECTS_RABBITMQ_PATTERN } from '@monorepo/constants';
import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { ProjectsService } from '../projects/projects.service';
import { RabbitMqService } from './rabbitmq.service';

@Controller()
export class RabbitMqMessagesController {
  private readonly logger = new Logger(RabbitMqMessagesController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  @MessagePattern(PROJECTS_RABBITMQ_PATTERN)
  async handleProjectsSync(
    @Payload() payload: ProjectsSyncJobData,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.rabbitMqService.markConsumerReady(
        message.fields.consumerTag ?? PROJECTS_RABBITMQ_PATTERN,
      );
      const result =
        await this.projectsService.handleRabbitMqProjectsSync(payload);

      channel.ack(message);
      this.rabbitMqService.markMessageProcessed(result.processedAt);
      this.logger.log(
        `RabbitMQ message processed from ${payload.source} with trigger ${payload.trigger}.`,
      );

      return result;
    } catch (error) {
      channel.nack(message, false, false);
      this.rabbitMqService.markConsumerError(error);
      this.logger.error(
        error instanceof Error
          ? error.message
          : 'Unknown RabbitMQ consumer error',
      );
      throw error;
    }
  }
}
