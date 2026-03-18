import { Body, Controller, Get, Post } from '@nestjs/common';
import { PublishProjectsSyncDto } from './publish-projects-sync.dto';
import { RabbitMqPublisherService } from './rabbitmq.publisher.service';
import { RabbitMqService } from './rabbitmq.service';

@Controller('api/rabbitmq')
export class RabbitMqController {
  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly rabbitMqPublisherService: RabbitMqPublisherService,
  ) {}

  @Get()
  getStatus() {
    return this.rabbitMqService.getStatus();
  }

  @Post('projects/sync')
  async publishProjectsSync(@Body() body: PublishProjectsSyncDto) {
    const result = await this.rabbitMqPublisherService.publishProjectsSync({
      source: body.source,
      trigger: body.trigger,
      requestedAt: body.requestedAt ?? new Date().toISOString(),
    });

    return {
      ok: true,
      publishedAt: new Date().toISOString(),
      result,
    };
  }
}
