import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { Public } from '../auth/public.decorator';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { DatabaseService } from '../database/database.service';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseService: DatabaseService,
    private readonly runtimeConfigService: RuntimeConfigService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  @ApiOperation({ summary: 'Health check (DB, Redis, RabbitMQ)' })
  @Public()
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
      ...(this.runtimeConfigService.isRabbitMqEnabled()
        ? [() => this.checkRabbitMq()]
        : []),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.databaseService.ping();
      return { database: { status: 'up' } };
    } catch {
      return { database: { status: 'down' } };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    if (!this.runtimeConfigService.isBullMqEnabled()) {
      return { redis: { status: 'up' } };
    }

    try {
      const client = new Redis(
        this.runtimeConfigService.getBullMqConnectionUrl(),
      );
      await client.ping();
      await client.quit();
      return { redis: { status: 'up' } };
    } catch {
      return { redis: { status: 'down' } };
    }
  }

  private async checkRabbitMq(): Promise<HealthIndicatorResult> {
    const status = this.rabbitMqService.getStatus();
    return {
      rabbitmq: { status: status.connected ? 'up' : 'down' },
    };
  }
}
