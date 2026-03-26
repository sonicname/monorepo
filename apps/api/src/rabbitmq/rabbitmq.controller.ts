import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PublishProjectsSyncDto } from './publish-projects-sync.dto';
import { RabbitMqPublisherService } from './rabbitmq.publisher.service';
import { RabbitMqService } from './rabbitmq.service';

@ApiTags('RabbitMQ')
@Public()
@Controller('api/rabbitmq')
export class RabbitMqController {
  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly rabbitMqPublisherService: RabbitMqPublisherService,
  ) {}

  @ApiOperation({ summary: 'Get RabbitMQ connection status' })
  @Get()
  getStatus() {
    return this.rabbitMqService.getStatus();
  }

  @ApiOperation({ summary: 'Publish projects sync message' })
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
