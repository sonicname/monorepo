import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, RabbitMqModule],
  controllers: [HealthController],
})
export class HealthModule {}
