import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { DatabaseService } from '../database/database.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseService: DatabaseService,
  ) {}

  @ApiOperation({ summary: 'Health check (DB connectivity)' })
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    const dbCheck: HealthIndicatorFunction = async () => {
      try {
        await this.databaseService.ping();
        return { database: { status: 'up' } };
      } catch {
        return { database: { status: 'down' } };
      }
    };

    return this.health.check([dbCheck]);
  }
}
